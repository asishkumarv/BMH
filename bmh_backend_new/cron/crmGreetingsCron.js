const pool = require('../db');
const axios = require('axios');

const isCrmGreetingsEnabled = async () => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'crm_greetings_cron_enabled'");
    if (result.rowCount === 0) return true;
    let val = result.rows[0].value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch (e) {}
    }
    return val !== false && val !== 'false' && val !== 'off' && val !== 0 && val !== '0';
  } catch (e) {
    console.error('Error loading crm greetings setting:', e.message);
    return true;
  }
};

let isProcessing = false;
// Capture server/cron start time so we do not send to old historical orders
const serviceStartTime = new Date();

// Helper to retrieve DoubleTick Configuration
const getDoubleTickConfig = async () => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'doubletick_config'");
    if (result.rowCount === 0) return null;
    let val = result.rows[0].value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch (e) { return null; }
    }
    return val;
  } catch (e) {
    console.error('Error loading DoubleTick configuration:', e.message);
    return null;
  }
};

// Safe parser for order_items columns
function parseItemsList(orderItemsCol) {
  if (!orderItemsCol) return [];
  if (Array.isArray(orderItemsCol)) return orderItemsCol;
  if (typeof orderItemsCol === 'string') {
    try {
      const parsed = JSON.parse(orderItemsCol);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Sometimes it is double encoded or wrapped in quotes
      try {
        const doubleParsed = JSON.parse(JSON.parse(orderItemsCol));
        if (Array.isArray(doubleParsed)) return doubleParsed;
      } catch (inner) {
        console.error('Error parsing order_items JSON string:', e.message);
      }
    }
  }
  return [];
}

// Process a single Order/Invoice record
async function processGreetings(order, tableType) {
  const orderId = order.id;
  const patientName = order.patient_name || 'Valued Customer';
  const phone = order.patient_contact_no || order.mobile_no || '';
  const orderNo = order.order_no || order.invoice_id || `ID: ${orderId}`;

  // Clean phone number
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    console.log(`[CRM Greetings] Skipping order ${orderNo} due to invalid phone: "${phone}"`);
    return true; // Mark as processed so we don't scan it repeatedly
  }

  // Retrieve Items dynamically based on table type
  let items = [];
  try {
    if (tableType === 'ecogreen_sales_invoices') {
      const itemsRes = await pool.query(
        'SELECT itemcode, item_name, total_loose_qty FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1',
        [orderId]
      );
      items = itemsRes.rows.map(r => ({
        itemcode: r.itemcode,
        item_name: r.item_name,
        qty: r.total_loose_qty || 1
      }));
    } else if (tableType === 'ecogreen_sales_orders') {
      const itemsRes = await pool.query(
        'SELECT itemcode, item_name, total_loose_qty FROM ecogreen_sales_order_items WHERE sales_order_id = $1',
        [orderId]
      );
      items = itemsRes.rows.map(r => ({
        itemcode: r.itemcode,
        item_name: r.item_name,
        qty: r.total_loose_qty || 1
      }));
    } else if (tableType === 'ecogreensales_invoices' || tableType === 'ecogreensales_orders') {
      const rawList = parseItemsList(order.order_items);
      items = rawList.map(item => {
        const code = item.item_code || item.itemcode;
        const name = item.medicine_name || item.item_name || item.itemName;
        const qty = item.quantity || item.qty || item.total_loose_qty || 1;
        return {
          itemcode: code,
          item_name: name,
          qty: qty
        };
      });
    }
  } catch (err) {
    console.error(`[CRM Greetings] Error fetching items for ${tableType} ${orderId}:`, err.message);
    return false; // Retry later
  }

  if (items.length === 0) {
    console.log(`[CRM Greetings] No items found in ${tableType} ${orderNo}`);
    return true; // Mark as processed
  }

  // Fetch medicine metadata for these items
  const itemCodes = items.map(i => i.itemcode).filter(Boolean);
  if (itemCodes.length === 0) {
    console.log(`[CRM Greetings] No valid item codes in ${tableType} ${orderNo}`);
    return true; // Mark as processed
  }

  let metadataMap = {};
  try {
    const metaRes = await pool.query(
      'SELECT c_item_code, video_link, usage_description FROM medicine_metadata WHERE c_item_code = ANY($1)',
      [itemCodes]
    );
    metaRes.rows.forEach(row => {
      metadataMap[row.c_item_code] = row;
    });
  } catch (err) {
    console.error(`[CRM Greetings] Error fetching medicine metadata for ${tableType} ${orderNo}:`, err.message);
    return false; // Retry later
  }

  // Filter items that actually have description or video link
  const itemsWithGuides = items.map(item => {
    const meta = metadataMap[item.itemcode];
    if (meta && (meta.usage_description || meta.video_link)) {
      return {
        name: item.item_name,
        qty: item.qty,
        desc: meta.usage_description,
        video: meta.video_link
      };
    }
    return null;
  }).filter(Boolean);

  // If no items have descriptions/videos in our database, we do not send the message, but mark as processed
  if (itemsWithGuides.length === 0) {
    console.log(`[CRM Greetings] No medicine guides found in DB for ${tableType} ${orderNo}. Skipping message.`);
    return true;
  }

  // Fetch DoubleTick config
  const config = await getDoubleTickConfig();
  if (!config || !config.apiKey || !config.wabaNumber) {
    console.log(`[CRM Greetings] DoubleTick config is missing or incomplete. Skipping sending.`);
    return false; // Retry later when admin configures it
  }

  // Build greetings message content placeholders (Using 17 static template variable placeholders for layout structure)
  let v3 = "-", v4 = "-", v5 = "-", v6 = "-", v7 = "-", v8 = "-", v9 = "-", v10 = "-", v11 = "-", v12 = "-", v13 = "-", v14 = "-", v15 = "-", v16 = "-", v17 = "-";

  if (itemsWithGuides.length > 0) {
    const item = itemsWithGuides[0];
    v3 = `1. ${item.name} (Qty: ${item.qty})`;
    v4 = item.desc ? ` [ Instructions: ${item.desc} | ` : ` [ Instructions: - | `;
    v5 = item.video ? `Video: ${item.video} ]` : `Video: - ]`;
  }

  if (itemsWithGuides.length > 1) {
    const item = itemsWithGuides[1];
    v6 = `2. ${item.name} (Qty: ${item.qty})`;
    v7 = item.desc ? ` [ Instructions: ${item.desc} | ` : ` [ Instructions: - | `;
    v8 = item.video ? `Video: ${item.video} ]` : `Video: - ]`;
  }

  if (itemsWithGuides.length > 2) {
    const item = itemsWithGuides[2];
    v9 = `3. ${item.name} (Qty: ${item.qty})`;
    v10 = item.desc ? ` [ Instructions: ${item.desc} | ` : ` [ Instructions: - | `;
    v11 = item.video ? `Video: ${item.video} ]` : `Video: - ]`;
  }

  if (itemsWithGuides.length > 3) {
    const item = itemsWithGuides[3];
    v12 = `4. ${item.name} (Qty: ${item.qty})`;
    v13 = item.desc ? ` [ Instructions: ${item.desc} | ` : ` [ Instructions: - | `;
    v14 = item.video ? `Video: ${item.video} ]` : `Video: - ]`;
  }

  if (itemsWithGuides.length > 4) {
    // For 5 or more medicines, combine the remaining ones into the last placeholder
    const item = itemsWithGuides[4];
    v15 = `5. ${item.name} (Qty: ${item.qty})`;
    
    if (itemsWithGuides.length > 5) {
      const rest = itemsWithGuides.slice(5);
      const restNames = rest.map((it, idx) => `${idx + 6}. ${it.name} (Qty: ${it.qty})`).join('; ');
      v15 += `; ${restNames}`;
      
      const descs = rest.map(it => it.desc || '-').join(' | ');
      v16 = ` [ Instructions: ${item.desc || '-'} | ${descs} | `;
      
      const videos = rest.map(it => it.video || '-').join(' | ');
      v17 = `Video: ${item.video || '-'} | ${videos} ]`;
    } else {
      v16 = item.desc ? ` [ Instructions: ${item.desc} | ` : ` [ Instructions: - | `;
      v17 = item.video ? `Video: ${item.video} ]` : `Video: - ]`;
    }
  }

  // Send Template message via DoubleTick V2 API using medicine_usage_greetings2
  try {
    await axios.post(
      'https://public.doubletick.io/v2/whatsapp/message/template',
      {
        messages: [
          {
            to: cleanPhone,
            from: config.wabaNumber,
            content: {
              templateName: 'medicine_usage_greetings2',
              language: config.defaultLanguage || 'en',
              templateData: {
                body: {
                  placeholders: [
                    { "1": patientName },
                    { "2": orderNo },
                    { "3": v3 },
                    { "4": v4 },
                    { "5": v5 },
                    { "6": v6 },
                    { "7": v7 },
                    { "8": v8 },
                    { "9": v9 },
                    { "10": v10 },
                    { "11": v11 },
                    { "12": v12 },
                    { "13": v13 },
                    { "14": v14 },
                    { "15": v15 },
                    { "16": v16 },
                    { "17": v17 }
                  ]
                }
              }
            }
          }
        ],
        byPassMediaUrlValidation: false
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': config.apiKey
        }
      }
    );
    console.log(`[CRM Greetings] WhatsApp template greetings successfully sent to ${cleanPhone} for ${tableType} ${orderNo}`);
    return true;
  } catch (err) {
    console.error(`[CRM Greetings] Failed to send DoubleTick Template WhatsApp to ${cleanPhone}:`, err.response?.data || err.message);
    const isPermanentError = err.response && (err.response.status === 400 || err.response.status === 404);
    return isPermanentError;
  }
}

async function runGreetingsScan() {
  if (isProcessing) return;
  const isEnabled = await isCrmGreetingsEnabled();
  if (!isEnabled) return;
  isProcessing = true;

  try {
    // 1. Scan ecogreen_sales_invoices (with underscores)
    const res1 = await pool.query(
      `SELECT id, patient_name, mobile_no, invoice_id, order_no 
       FROM ecogreen_sales_invoices 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
       LIMIT 10`
    );
    for (const order of res1.rows) {
      const success = await processGreetings(order, 'ecogreen_sales_invoices');
      if (success) {
        await pool.query('UPDATE ecogreen_sales_invoices SET crm_greetings_sent = TRUE WHERE id = $1', [order.id]);
      }
    }

    // 2. Scan ecogreensales_invoices (without underscores)
    const res2 = await pool.query(
      `SELECT id, patient_name, patient_contact_no, invoice_id, order_no, order_items 
       FROM ecogreensales_invoices 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
       LIMIT 10`
    );
    for (const order of res2.rows) {
      const success = await processGreetings(order, 'ecogreensales_invoices');
      if (success) {
        await pool.query('UPDATE ecogreensales_invoices SET crm_greetings_sent = TRUE WHERE id = $1', [order.id]);
      }
    }

    // 3. Scan ecogreen_sales_orders (with underscores)
    const res3 = await pool.query(
      `SELECT id, patient_name, mobile_no, ip_no as order_no 
       FROM ecogreen_sales_orders 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
       LIMIT 10`
    );
    for (const order of res3.rows) {
      const success = await processGreetings(order, 'ecogreen_sales_orders');
      if (success) {
        await pool.query('UPDATE ecogreen_sales_orders SET crm_greetings_sent = TRUE WHERE id = $1', [order.id]);
      }
    }

    // 4. Scan ecogreensales_orders (without underscores)
    const res4 = await pool.query(
      `SELECT id, patient_name, patient_contact_no, order_no, order_items 
       FROM ecogreensales_orders 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
       LIMIT 10`
    );
    for (const order of res4.rows) {
      const success = await processGreetings(order, 'ecogreensales_orders');
      if (success) {
        await pool.query('UPDATE ecogreensales_orders SET crm_greetings_sent = TRUE WHERE id = $1', [order.id]);
      }
    }

  } catch (err) {
    console.error('[CRM Greetings Cron] Scan error:', err.message);
  } finally {
    isProcessing = false;
  }
}

function startCrmGreetingsCron() {
  console.log('⏰ Starting CRM greetings message scanning interval (every 10 seconds)...');
  setInterval(async () => {
    const isEnabled = await isCrmGreetingsEnabled();
    if (!isEnabled) {
      return;
    }
    runGreetingsScan();
  }, 10000);
}

module.exports = {
  startCrmGreetingsCron,
  runGreetingsScan
};

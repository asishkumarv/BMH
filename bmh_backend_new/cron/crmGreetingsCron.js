const pool = require('../db');
const axios = require('axios');

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

// Process a single Order/Invoice
async function processGreetings(order, type) {
  const orderId = order.id;
  const patientName = order.patient_name || 'Valued Customer';
  let phone = order.patient_contact_no || order.mobile_no || '';
  const orderNo = order.order_no || order.invoice_id || `ID: ${orderId}`;

  // Clean phone number
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    console.log(`[CRM Greetings] Skipping order ${orderNo} due to invalid phone: "${phone}"`);
    return true; // Mark as processed
  }

  // Fetch Items
  let items = [];
  try {
    if (type === 'invoice') {
      const itemsRes = await pool.query(
        'SELECT itemcode, item_name, total_loose_qty FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1',
        [orderId]
      );
      items = itemsRes.rows;
    } else {
      const itemsRes = await pool.query(
        'SELECT itemcode, item_name, total_loose_qty FROM ecogreen_sales_order_items WHERE sales_order_id = $1',
        [orderId]
      );
      items = itemsRes.rows;
    }
  } catch (err) {
    console.error(`[CRM Greetings] Error fetching items for ${type} ${orderId}:`, err.message);
    return false; // Retry later
  }

  if (items.length === 0) {
    console.log(`[CRM Greetings] No items found in ${type} ${orderNo}`);
    return true; // Mark as processed
  }

  // Fetch medicine metadata for these items
  const itemCodes = items.map(i => i.itemcode).filter(Boolean);
  if (itemCodes.length === 0) {
    console.log(`[CRM Greetings] No valid item codes in ${type} ${orderNo}`);
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
    console.error(`[CRM Greetings] Error fetching medicine metadata for ${type} ${orderNo}:`, err.message);
    return false; // Retry later
  }

  // Filter items that actually have description or video link
  const itemsWithGuides = items.map(item => {
    const meta = metadataMap[item.itemcode];
    if (meta && (meta.usage_description || meta.video_link)) {
      return {
        name: item.item_name,
        qty: item.total_loose_qty || 1,
        desc: meta.usage_description,
        video: meta.video_link
      };
    }
    return null;
  }).filter(Boolean);

  // If no items have descriptions/videos in our database, we do not send the message, but mark as processed
  if (itemsWithGuides.length === 0) {
    console.log(`[CRM Greetings] No medicine guides found in DB for ${type} ${orderNo}. Skipping message.`);
    return true;
  }

  // Fetch DoubleTick config
  const config = await getDoubleTickConfig();
  if (!config || !config.apiKey || !config.wabaNumber) {
    console.log(`[CRM Greetings] DoubleTick config is missing or incomplete. Skipping sending.`);
    return false; // Retry later when admin configures it
  }

  // Build greetings message content
  let messageText = `Hello ${patientName},\n\n`;
  messageText += `Greetings from *Bharat Medical Hall*! 🌟\n`;
  messageText += `Your order *${orderNo}* has been successfully delivered. \n\n`;
  messageText += `Here are the usage instructions for your prescribed medicines:\n\n`;

  itemsWithGuides.forEach((item, index) => {
    messageText += `*${index + 1}. ${item.name}* (Qty: ${item.qty})\n`;
    if (item.desc) {
      messageText += `📝 *Instructions:* ${item.desc}\n`;
    }
    if (item.video) {
      messageText += `🎥 *Video Guide:* ${item.video}\n`;
    }
    messageText += `\n`;
  });

  messageText += `Thank you for choosing Bharat Medical Hall! Stay healthy and safe. ❤️`;

  // Send WhatsApp message via DoubleTick
  try {
    await axios.post(
      'https://public.doubletick.io/whatsapp/message/text',
      {
        to: cleanPhone,
        from: config.wabaNumber,
        content: {
          text: messageText
        }
      },
      {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': config.apiKey
        }
      }
    );
    console.log(`[CRM Greetings] WhatsApp greetings successfully sent to ${cleanPhone} for ${type} ${orderNo}`);
    return true;
  } catch (err) {
    console.error(`[CRM Greetings] Failed to send DoubleTick WhatsApp to ${cleanPhone}:`, err.response?.data || err.message);
    // If it's a permanent error (e.g. 400 invalid number), we don't want to retry forever
    const isPermanentError = err.response && (err.response.status === 400 || err.response.status === 404);
    return isPermanentError;
  }
}

async function runGreetingsScan() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // 1. Scan ecogreen_sales_invoices
    const invoicesRes = await pool.query(
      `SELECT id, patient_name, patient_contact_no, mobile_no, invoice_id, order_no 
       FROM ecogreen_sales_invoices 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
         AND created_at >= $1
       LIMIT 10`,
      [serviceStartTime]
    );

    for (const invoice of invoicesRes.rows) {
      const success = await processGreetings(invoice, 'invoice');
      if (success) {
        await pool.query('UPDATE ecogreen_sales_invoices SET crm_greetings_sent = TRUE WHERE id = $1', [invoice.id]);
      }
    }

    // 2. Scan ecogreen_sales_orders
    const ordersRes = await pool.query(
      `SELECT id, patient_name, patient_contact_no, mobile_no, order_no 
       FROM ecogreen_sales_orders 
       WHERE status = 'Delivered' 
         AND crm_greetings_sent IS NOT TRUE 
         AND created_at >= $1
       LIMIT 10`,
      [serviceStartTime]
    );

    for (const order of ordersRes.rows) {
      const success = await processGreetings(order, 'order');
      if (success) {
        await pool.query('UPDATE ecogreen_sales_orders SET crm_greetings_sent = TRUE WHERE id = $1', [order.id]);
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
  setInterval(runGreetingsScan, 10000);
}

module.exports = {
  startCrmGreetingsCron,
  runGreetingsScan
};

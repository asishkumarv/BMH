const axios = require('axios');
const pool = require('../db');
const { fetchToken, cache } = require('../controllers/pharmacyController');

let lastSyncTime = null;

async function syncSalesOrders() {
    console.log(`🔄 Syncing sales orders...`);
    try {
        const token = cache.get("default_token") || (await fetchToken()).apiKey;
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const padMs = (n) => n.toString().padStart(3, '0');

        let inputDateTimeStr = '';
        if (!lastSyncTime) {
            // Initial run - fetch historically since June 10, 2026 to import test orders
            inputDateTimeStr = '2026-06-10 15:20:37.857';
        } else {
            // Subsequent run - fetch since lastSyncTime
            const queryDate = lastSyncTime;
            inputDateTimeStr = `${queryDate.getFullYear()}-${pad(queryDate.getMonth() + 1)}-${pad(queryDate.getDate())} ${pad(queryDate.getHours())}:${pad(queryDate.getMinutes())}:${pad(queryDate.getSeconds())}.${padMs(queryDate.getMilliseconds())}`;
        }

        const payload = {
            "c2Code": "P00000",
            "storeId": "001",
            "prodCode": "02",
            "inputDateTime": inputDateTimeStr,
            "apiKey": token
        };

        console.log(`Sending sales order sync payload: ${JSON.stringify(payload)}`);
        
        const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_salesord_data", payload, { timeout: 30000 });
        
        // Update lastSyncTime to the timestamp before API fetch
        lastSyncTime = now;

        let responseData = apiRes.data;
        if (typeof responseData === 'string') {
            // Escape bad control characters (ASCII 0-31) except space and standard printables
            let sanitized = responseData.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
                if (match === '\n') return '\\n';
                if (match === '\r') return '\\r';
                if (match === '\t') return '\\t';
                return '';
            });
            // Clean up decimal points with no leading zeros (e.g. :.837 to :0.837)
            let cleaned = sanitized.replace(/(:\s*|,\s*|\[\s*)\.(\d+)/g, "$10.$2");
            try {
                responseData = JSON.parse(cleaned);
            } catch (e) {
                // Try cleaning if it is malformed (e.g. wrapped improperly or contains raw }{ between objects)
                let cleanedStr = cleaned.trim();
                if (cleanedStr.includes('}{')) {
                    cleanedStr = '[' + cleanedStr.replace(/\}\{/g, '},{') + ']';
                    responseData = { saleOrder: JSON.parse(cleanedStr) };
                } else {
                    console.error("❌ Failed to parse sales order API string:", e.message);
                    return;
                }
            }
        }

        const orders = responseData.saleOrder || [];
        if (orders.length > 0) {
            console.log(`Fetched ${orders.length} sales orders. Processing insertions...`);
            
            const orderNos = orders.map(o => o.order_no).filter(Boolean);
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const checkRes = await client.query('SELECT order_no FROM ecogreensales_orders WHERE order_no = ANY($1)', [orderNos]);
                const existingOrderNos = new Set(checkRes.rows.map(r => r.order_no));
                
                const insertQuery = `
                  INSERT INTO ecogreensales_orders (
                    order_id, order_no, createduser, invoice_id, payment_status,
                    total_price, total_discount, order_for, delivered_by, shipping_charge,
                    patient_name, patient_contact_no, patient_address, pharmacy, order_items,
                    created_at, status
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Pending')
                `;

                for (const order of orders) {
                    if (!order.order_no) continue;
                    if (existingOrderNos.has(order.order_no)) continue;

                    await client.query(insertQuery, [
                        order.order_id || null,
                        order.order_no,
                        order.createduser || null,
                        order.invoice_id || null,
                        order.payment_status || 'Pending',
                        order.total_price != null ? String(order.total_price) : '0',
                        order.total_discount != null ? String(order.total_discount) : '0',
                        order.order_for || null,
                        order.delivered_by || null,
                        order.shipping_charge != null ? String(order.shipping_charge) : '0',
                        order.patient_name || null,
                        order.patient_contact_no || null,
                        order.patient_address ? JSON.stringify(order.patient_address) : null,
                        order.pharmacy ? JSON.stringify(order.pharmacy) : null,
                        order.order_items ? JSON.stringify(order.order_items) : null,
                        order.created_at || new Date()
                    ]);
                }
                
                await client.query('COMMIT');
                console.log(`✅ Successfully synced ${orders.length} sales orders into DB.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error("Error saving sales orders to database:", err.message);
            } finally {
                client.release();
            }
        } else {
            console.log("No new sales orders found.");
        }
    } catch (err) {
        console.error("❌ salesOrderSync failed:", err.message);
    }
}

function startSalesOrderCron() {
    console.log("⏰ Starting 30-second interval Sales Order background sync...");
    // Run immediately on start
    syncSalesOrders();
    // Schedule every 30 seconds
    setInterval(syncSalesOrders, 30000);
}

module.exports = {
    startSalesOrderCron,
    syncSalesOrders
};

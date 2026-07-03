const cron = require('node-cron');
const axios = require('axios');
const pool = require('../db');
const { fetchToken, cache } = require('../controllers/pharmacyController');

async function syncPurchaseOrders() {
    console.log(`🔄 Syncing purchase orders...`);
    try {
        const token = cache.get("default_token") || (await fetchToken()).apiKey;
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const payload = {
            "c2Code": "P00000",
            "storeId": "001",
            "prodCode": "02",
            "apiKey": token,
            "fromDate": todayStr,
            "toDate": todayStr
        };

        const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_po_fetch", payload, {timeout: 30000});
        
        let responseStr = typeof apiRes.data === 'string' ? apiRes.data : JSON.stringify(apiRes.data);
        
        // The API returns malformed JSON like }{ between objects. 
        // We need to fix it by wrapping in an array.
        if (responseStr.includes('}{')) {
            responseStr = '[' + responseStr.replace(/\}\{/g, '},{') + ']';
        } else if (!responseStr.startsWith('[')) {
            responseStr = '[' + responseStr + ']';
        }

        let orders = [];
        try {
            orders = JSON.parse(responseStr);
        } catch (e) {
            console.error("❌ Failed to parse purchase order JSON", e);
            return;
        }

        if (orders.length > 0) {
            console.log(`Fetched ${orders.length} purchase orders. Processing...`);

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const queryText = `
                    INSERT INTO ecogreenpurchase_orders 
                        (br_code, year, prefix, srno, custcode, custname, refcode, refname, total, details, status) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE((SELECT status FROM ecogreenpurchase_orders WHERE srno=$4 AND year=$2 LIMIT 1), 'Pending'))
                    ON CONFLICT DO NOTHING;
                `;
                // Wait, do we have a unique constraint? The previous schema didn't show one. 
                // Let's manually check if it exists instead of ON CONFLICT.
                for (let i = 0; i < orders.length; i++) {
                    const order = orders[i];
                    
                    // Check if exists
                    const existsRes = await client.query('SELECT id FROM ecogreenpurchase_orders WHERE br_code=$1 AND year=$2 AND prefix=$3 AND srno=$4', 
                        [order.br_code, order.year, order.prefix, order.srno]);

                    if (existsRes.rows.length === 0) {
                        await client.query(`
                            INSERT INTO ecogreenpurchase_orders 
                                (br_code, year, prefix, srno, custcode, custname, refcode, refname, total, details, status, created_at) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', CURRENT_TIMESTAMP)`, [
                            order.br_code, order.year, order.prefix, order.srno, order.custcode, order.custname,
                            order.refcode, order.refname, order.total, JSON.stringify(order.details)
                        ]);
                    } else {
                        // Optionally update details/total if they change, but usually POs are immutable once placed.
                        await client.query(`
                            UPDATE ecogreenpurchase_orders 
                            SET total = $1, details = $2 
                            WHERE id = $3`, [order.total, JSON.stringify(order.details), existsRes.rows[0].id]);
                    }
                }
                
                await client.query('COMMIT');
                console.log(`✅ Successfully synced ${orders.length} purchase orders into DB.`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } else {
            console.log("⚠️ No data received from purchase order API.");
        }
    } catch (err) {
        console.error("❌ Purchase Order sync failed:", err.message);
    }
}

async function startPurchaseOrderCron() {
    // Initial sync
    await syncPurchaseOrders();

    // Schedule every 20 minutes
    cron.schedule('*/20 * * * *', async () => {
        console.log("⏰ Running scheduled purchase order background sync...");
        await syncPurchaseOrders();
    });
}

module.exports = {
    startPurchaseOrderCron,
    syncPurchaseOrders // Exporting for manual trigger if needed
};

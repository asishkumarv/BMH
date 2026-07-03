const cron = require('node-cron');
const axios = require('axios');
const pool = require('../db');
const { fetchToken, cache } = require('../controllers/pharmacyController');

async function initMedicineDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ecogreen_medicines (
            id SERIAL PRIMARY KEY,
            c_item_code VARCHAR(100),
            itemName VARCHAR(255),
            itemQtyPerBox INTEGER,
            batchNo VARCHAR(100),
            stockBalQty DECIMAL(10,2),
            expiryDate VARCHAR(50),
            mrp DECIMAL(10,2),
            saleRate DECIMAL(10,2),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (c_item_code, batchNo)
        );
    `;
    await pool.query(createTableQuery);
    console.log("✅ ecogreen_medicines table ensured in DB.");
}

async function syncMedicines(inputDateTime) {
    console.log(`🔄 Syncing medicines from ${inputDateTime}...`);
    try {
        const token = cache.get("default_token") || (await fetchToken()).apiKey;
        const payload = { 
            "c2Code": "P00000", 
            "storeId": "001", 
            "prodCode": "02", 
            "inputDateTime": inputDateTime,
            "itemCodes": [],
            "apiKey": token 
        };

        const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_stock_data", payload, {timeout: 30000});
        
        if (apiRes.data && Array.isArray(apiRes.data.data)) {
            const rawMedicines = apiRes.data.data;
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            // Filter non-expired
            const validMedicines = rawMedicines.filter(m => {
                if (!m.expiryDate) return false;
                // Compare YYYY-MM-DD
                return m.expiryDate >= todayStr;
            });

            console.log(`Fetched ${rawMedicines.length} items. After expiry filter: ${validMedicines.length} items to insert/update.`);

            // Insert/Update loop
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const queryText = `
                    INSERT INTO ecogreen_medicines 
                        (c_item_code, itemName, itemQtyPerBox, batchNo, stockBalQty, expiryDate, mrp, saleRate, updated_at) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    ON CONFLICT (c_item_code, batchNo) 
                    DO UPDATE SET 
                        itemName = EXCLUDED.itemName,
                        itemQtyPerBox = EXCLUDED.itemQtyPerBox,
                        stockBalQty = EXCLUDED.stockBalQty,
                        expiryDate = EXCLUDED.expiryDate,
                        mrp = EXCLUDED.mrp,
                        saleRate = EXCLUDED.saleRate,
                        updated_at = CURRENT_TIMESTAMP;
                `;
                
                for (let i = 0; i < validMedicines.length; i++) {
                    const item = validMedicines[i];
                    await client.query(queryText, [
                        item.c_item_code,
                        item.itemName,
                        item.itemQtyPerBox || 1,
                        item.batchNo || 'N/A',
                        item.stockBalQty || 0,
                        item.expiryDate,
                        item.mrp || 0,
                        item.saleRate || 0
                    ]);
                }
                
                await client.query('COMMIT');
                console.log(`✅ Successfully synced ${validMedicines.length} medicines into DB.`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } else {
            console.log("⚠️ No data received from medicine API.");
        }
    } catch (err) {
        console.error("❌ Medicine sync failed:", err.message);
    }
}

// Format date for the API payload
const formatDateTime = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

async function startMedicineCron() {
    await initMedicineDB();

    // Check if table is empty
    const countRes = await pool.query('SELECT COUNT(*) FROM ecogreen_medicines');
    const count = parseInt(countRes.rows[0].count, 10);

    if (count === 0) {
        console.log("📦 ecogreen_medicines is empty! Running initial full sync...");
        // initial sync from long ago
        await syncMedicines("2023-01-01 10:10:00");
    }

    // Schedule hourly sync for recent changes
    // Get changes from past 1 hour and 5 minutes (small overlap)
    cron.schedule('0 * * * *', async () => {
        console.log("⏰ Running scheduled medicine background sync...");
        const d = new Date();
        d.setMinutes(d.getMinutes() - 65);
        await syncMedicines(formatDateTime(d));
    });
}

module.exports = {
    startMedicineCron
};

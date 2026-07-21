const axios = require('axios');
const pool = require('../db');
const { fetchToken, cache } = require('../controllers/pharmacyController');

let isSyncing = false;
let lastSyncTime = null;

async function syncSalesInvoices() {
    if (isSyncing) return;
    isSyncing = true;
    console.log(`🔄 Syncing sales invoices...`);
    try {
        const token = cache.get("default_token") || (await fetchToken()).apiKey;
        const now = new Date();
        
        let syncDate = new Date();
        if (!lastSyncTime) {
            // Initial run - fetch data from the last 7 days to seed the DB
            syncDate.setDate(syncDate.getDate() - 7);
        } else {
            // Subsequent run - fetch from the last 15 minutes to capture recent modifications/new invoices
            syncDate.setMinutes(syncDate.getMinutes() - 15);
        }

        const pad = (n) => n.toString().padStart(2, '0');
        const padMs = (n) => n.toString().padStart(3, '0');
        const inputDateTimeStr = `${syncDate.getFullYear()}-${pad(syncDate.getMonth() + 1)}-${pad(syncDate.getDate())} ${pad(syncDate.getHours())}:${pad(syncDate.getMinutes())}:${pad(syncDate.getSeconds())}.${padMs(syncDate.getMilliseconds())}`;

        const payload = {
            "c2Code": "P00000",
            "storeId": "001",
            "prodCode": "02",
            "inputDateTime": inputDateTimeStr,
            "apiKey": token
        };

        console.log(`Sending sales invoice sync payload with inputDateTime: ${inputDateTimeStr}`);
        
        const apiRes = await axios.post("http://117.211.64.158:21000/ws_c2_services_get_sales_data", payload, { timeout: 30000 });
        lastSyncTime = now;
        
        let responseData = apiRes.data;
        if (typeof responseData === 'string') {
            // Escape raw backslashes globally first
            let backslashEscaped = responseData.replace(/\\/g, '\\\\');

            // Escape bad control characters (ASCII 0-31) except space and standard printables
            let sanitized = backslashEscaped.replace(/[\x00-\x1F\x7F-\x9F]/g, (match) => {
                if (match === '\n') return '\\n';
                if (match === '\r') return '\\r';
                if (match === '\t') return '\\t';
                return '';
            });

            // Clean up decimal points with no leading zeros (including negative numbers, e.g. -.04 to -0.04)
            let cleaned = sanitized.replace(/(:\s*|,\s*|\[\s*|-)\.(\d+)/g, "$10.$2");

            // Escape unescaped double quotes inside values of string fields
            let quoteCleaned = cleaned.replace(/("(?:medicine_name|patient_name|address|locality|landmark|pharmacy_name|createduser|deliver_name|city|state|country|invoice_id|order_no|order_for|payment_status|order_type)")\s*:\s*"(.*?)"\s*([,}])/g, (match, key, val, suffix) => {
                const escapedVal = val.replace(/(?<!\\)"/g, '\\"');
                return `${key}:"${escapedVal}"${suffix}`;
            });

            try {
                responseData = JSON.parse(quoteCleaned);
            } catch (e) {
                // Try cleaning if it is malformed (e.g. wrapped improperly or contains raw }{ between objects)
                let cleanedStr = quoteCleaned.trim();
                if (cleanedStr.includes('}{')) {
                    cleanedStr = '[' + cleanedStr.replace(/\}\{/g, '},{') + ']';
                    responseData = { invoiceDetails: JSON.parse(cleanedStr) };
                } else {
                    console.error("❌ Failed to parse sales invoice API string:", e.message);
                    isSyncing = false;
                    return;
                }
            }
        }

        const invoices = responseData.invoiceDetails || [];
        if (invoices.length > 0) {
            console.log(`Fetched ${invoices.length} sales invoices. Processing insertions & updates...`);
            
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                for (const invoice of invoices) {
                    if (!invoice.invoice_id) continue;

                    // Address concatenation
                    let addrStr = '';
                    if (invoice.patient_address) {
                        const pa = invoice.patient_address;
                        addrStr = [pa.deliver_name, pa.address, pa.locality, pa.landmark, pa.city, pa.state, pa.pincode]
                            .filter(Boolean)
                            .join(', ');
                    }

                    // Date parsing from created_at
                    let ordDate = null;
                    let ordTime = null;
                    if (invoice.created_at) {
                        const parts = invoice.created_at.split(' ');
                        ordDate = parts[0] || null;
                        ordTime = parts[1] ? parts[1].substring(0, 8) : null;
                    }

                    // Ref No integer generation from order_no
                    let refNoInt = null;
                    if (invoice.order_no) {
                        const last9 = invoice.order_no.substring(invoice.order_no.length - 9);
                        refNoInt = parseInt(last9, 10) || null;
                    }

                    // Check if already exists in DB
                    const checkRes = await client.query(
                        'SELECT id, order_total, patient_address FROM ecogreen_sales_invoices WHERE ip_no = $1',
                        [invoice.invoice_id]
                    );

                    let salesInvoiceId = null;

                    if (checkRes.rowCount > 0) {
                        // Invoice already exists - update fields if they changed (or update generally)
                        salesInvoiceId = checkRes.rows[0].id;
                        
                        await client.query(`
                            UPDATE ecogreen_sales_invoices
                            SET 
                                patient_name = $1,
                                patient_address = $2,
                                order_total = $3,
                                order_disc_per = $4,
                                counter_sale = $5,
                                act_name = $6,
                                user_id = $7,
                                act_code = $8,
                                reminder_date = $9,
                                order_type = $10,
                                invoice_id = $11,
                                payment_status = $12,
                                order_for = $13,
                                delivered_by = $14,
                                shipping_charge = $15,
                                patient_address_details = $16,
                                pharmacy_details = $17,
                                order_no = $18
                            WHERE id = $19
                        `, [
                            invoice.patient_address?.deliver_name || 'Walk-in',
                            addrStr || null,
                            invoice.total_price ? parseFloat(invoice.total_price) : 0,
                            invoice.total_discount ? parseFloat(invoice.total_discount) : 0,
                            invoice.order_type || null, // counter_sale
                            invoice.order_for || null, // act_name
                            invoice.createduser || null, // user_id
                            invoice.order_no || null, // act_code
                            invoice.reminder_date || null,
                            invoice.order_type || null,
                            invoice.invoice_id || null,
                            invoice.payment_status || null,
                            invoice.order_for || null,
                            invoice.delivered_by || null,
                            invoice.shipping_charge || null,
                            invoice.patient_address ? JSON.stringify(invoice.patient_address) : null,
                            invoice.pharmacy ? JSON.stringify(invoice.pharmacy) : null,
                            invoice.order_no || null,
                            salesInvoiceId
                        ]);

                        // Delete existing items to recreate updated item set
                        await client.query('DELETE FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1', [salesInvoiceId]);

                    } else {
                        // Insert new invoice header
                        const insertHeaderQuery = `
                            INSERT INTO ecogreen_sales_invoices (
                                ip_no, patient_name, patient_address, counter_sale,
                                ord_date, ord_time, user_id, act_code, act_name,
                                order_total, order_disc_per, ref_no, created_at,
                                reminder_date, order_type, invoice_id, payment_status,
                                order_for, delivered_by, shipping_charge, patient_address_details,
                                pharmacy_details, order_no
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP,
                                $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                            )
                            RETURNING id
                        `;

                        const headerValues = [
                            invoice.invoice_id,
                            invoice.patient_address?.deliver_name || 'Walk-in',
                            addrStr || null,
                            invoice.order_type || null, // counter_sale
                            ordDate,
                            ordTime,
                            invoice.createduser || null, // user_id
                            invoice.order_no || null, // act_code
                            invoice.order_for || null, // act_name
                            invoice.total_price ? parseFloat(invoice.total_price) : 0,
                            invoice.total_discount ? parseFloat(invoice.total_discount) : 0,
                            refNoInt,
                            invoice.reminder_date || null,
                            invoice.order_type || null,
                            invoice.invoice_id || null,
                            invoice.payment_status || null,
                            invoice.order_for || null,
                            invoice.delivered_by || null,
                            invoice.shipping_charge || null,
                            invoice.patient_address ? JSON.stringify(invoice.patient_address) : null,
                            invoice.pharmacy ? JSON.stringify(invoice.pharmacy) : null,
                            invoice.order_no || null
                        ];

                        const headerRes = await client.query(insertHeaderQuery, headerValues);
                        salesInvoiceId = headerRes.rows[0].id;
                    }

                    // Insert Items
                    if (invoice.order_items && Array.isArray(invoice.order_items)) {
                        let itemSeq = 1;
                        for (const item of invoice.order_items) {
                            const insertItemQuery = `
                                INSERT INTO ecogreen_sales_invoice_items (
                                    sales_invoice_id, item_seq, itemcode, item_name, 
                                    total_loose_qty, total_loose_sch_qty, service_qty, 
                                    sale_rate, disc_per, sch_disc_per,
                                    item_code, medicine_name, quantity, discount,
                                    maxmrp, selling_price, sub_total
                                ) VALUES (
                                    $1, $2, $3, $4, $5, 0, 0, $6, $7, '0.00',
                                    $8, $9, $10, $11, $12, $13, $14
                                )
                            `;
                            const itemValues = [
                                salesInvoiceId,
                                itemSeq++,
                                item.item_code || null,
                                item.medicine_name || null,
                                item.quantity ? parseInt(item.quantity, 10) : 0,
                                item.maxmrp ? parseFloat(item.maxmrp) : (item.selling_price ? parseFloat(item.selling_price) : 0),
                                item.discount ? item.discount.toString() : '0.00',
                                item.item_code || null,
                                item.medicine_name || null,
                                item.quantity ? parseInt(item.quantity, 10) : null,
                                item.discount ? parseFloat(item.discount) : null,
                                item.maxmrp ? parseFloat(item.maxmrp) : null,
                                item.selling_price ? parseFloat(item.selling_price) : null,
                                item.sub_total ? parseFloat(item.sub_total) : null
                            ];
                            await client.query(insertItemQuery, itemValues);
                        }
                    }
                }

                await client.query('COMMIT');
                console.log(`✅ Sales invoices synced and updated successfully.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error("❌ Transaction error during sales invoice sync:", err.message);
            } finally {
                client.release();
            }
        } else {
            console.log(`No new or updated sales invoices since last interval.`);
        }

    } catch (err) {
        console.error("❌ salesInvoiceSync failed:", err.message);
    } finally {
        isSyncing = false;
    }
}

function startSalesInvoiceCron() {
    console.log(`⏰ Starting Sales Invoice sync interval (runs every 5 seconds)...`);
    // Run immediately on start
    syncSalesInvoices();
    // Start interval
    setInterval(syncSalesInvoices, 5000);
}

module.exports = {
    startSalesInvoiceCron,
    syncSalesInvoices
};

const axios = require('axios');
const pool = require('../db');
const { fetchToken, cache } = require('../controllers/pharmacyController');

let lastSyncTime = null;

async function syncSalesOrders() {
    console.log(`🔄 Syncing sales orders...`);
    try {
        const toggleRes = await pool.query("SELECT value FROM settings WHERE key = 'sales_order_auto_assign_toggle'");
        const autoAssignToggleOn = toggleRes.rows.length > 0 ? (typeof toggleRes.rows[0].value === 'string' ? JSON.parse(toggleRes.rows[0].value) : toggleRes.rows[0].value) : false;

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
                
                const checkRes = await client.query(
                    'SELECT order_no, invoice_id, payment_status, delivered_by, createduser FROM ecogreensales_orders WHERE order_no = ANY($1)',
                    [orderNos]
                );
                const existingOrders = new Map(checkRes.rows.map(r => [r.order_no, {
                    invoice_id: r.invoice_id,
                    payment_status: r.payment_status,
                    delivered_by: r.delivered_by,
                    createduser: r.createduser
                }]));

                const ordersToAutoAssign = [];
                
                const insertQueryStart = `
                  INSERT INTO ecogreensales_orders (
                    order_id, order_no, createduser, invoice_id, payment_status,
                    total_price, total_discount, order_for, delivered_by, shipping_charge,
                    patient_name, patient_contact_no, patient_address, pharmacy, order_items,
                    created_at, status
                  ) VALUES 
                `;
                
                const valueRows = [];
                const queryParams = [];
                let paramCount = 1;
                const processedInThisBatch = new Set();
                
                for (const order of orders) {
                    if (!order.order_no) continue;
                    
                    if (existingOrders.has(order.order_no)) {
                        const existing = existingOrders.get(order.order_no);
                        let needsUpdate = false;
                        const updateFields = [];
                        const updateParams = [];
                        
                        if (order.invoice_id && order.invoice_id !== existing.invoice_id) {
                            updateFields.push(`invoice_id = $${updateParams.length + 1}`);
                            updateParams.push(order.invoice_id);
                            needsUpdate = true;
                            // Add to autoassign list if a new invoice id is added
                            ordersToAutoAssign.push(order);
                        }
                        if (order.payment_status && order.payment_status !== existing.payment_status) {
                            updateFields.push(`payment_status = $${updateParams.length + 1}`);
                            updateParams.push(order.payment_status);
                            needsUpdate = true;
                        }
                        if (order.delivered_by && order.delivered_by !== existing.delivered_by) {
                            updateFields.push(`delivered_by = $${updateParams.length + 1}`);
                            updateParams.push(order.delivered_by);
                            needsUpdate = true;
                        }
                        if (order.createduser && order.createduser !== existing.createduser) {
                            updateFields.push(`createduser = $${updateParams.length + 1}`);
                            updateParams.push(order.createduser);
                            needsUpdate = true;
                        }

                        if (needsUpdate) {
                            updateParams.push(order.order_no);
                            await client.query(
                                `UPDATE ecogreensales_orders SET ${updateFields.join(', ')} WHERE order_no = $${updateParams.length}`,
                                updateParams
                            );
                            console.log(`🔄 [Sync] Updated details for existing order ${order.order_no}`);
                        }
                        continue;
                    }
                    
                    if (processedInThisBatch.has(order.order_no)) continue;
                    processedInThisBatch.add(order.order_no);
                    ordersToAutoAssign.push(order);
                    
                    const rowParams = [
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
                    ];
                    
                    const placeholders = rowParams.map(() => `$${paramCount++}`);
                    placeholders.push("'Pending'");
                    
                    valueRows.push(`(${placeholders.join(', ')})`);
                    queryParams.push(...rowParams);
                }
                
                if (valueRows.length > 0) {
                    const finalQuery = insertQueryStart + valueRows.join(', ');
                    await client.query(finalQuery, queryParams);
                    console.log(`Bulk inserted ${valueRows.length} sales orders.`);
                }
                
                await client.query('COMMIT');
                console.log(`✅ Successfully synced ${orders.length} sales orders into DB.`);

                if (autoAssignToggleOn && ordersToAutoAssign.length > 0) {
                    console.log(`🤖 Auto-Assign is ON. Processing ${ordersToAutoAssign.length} orders...`);
                    for (const order of ordersToAutoAssign) {
                        await tryAutoAssign(pool, order);
                    }
                }
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

async function tryAutoAssign(db, order) {
    const phone = order.patient_contact_no || order.mobile_no || '';
    if (!phone) {
        await db.query(`UPDATE ecogreensales_orders SET needs_review = TRUE, remark = 'No Phone' WHERE id = $1`, [order.id]);
        await db.query(`UPDATE ecogreen_sales_orders SET needs_review = TRUE, remark = 'No Phone' WHERE order_no = $1`, [order.order_no]);
        return;
    }

    // Clean phone number (get 10 digits)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }

    try {
        const uniqueAddresses = [];
        const normAddresses = new Set();
        
        const getNormAddress = (addr) => {
            if (!addr) return '';
            const obj = typeof addr === 'string' ? JSON.parse(addr) : addr;
            return `${obj.address || ''}|${obj.locality || ''}|${obj.pincode || ''}`.toLowerCase().replace(/\s+/g, '');
        };

        const addCandidate = (addressObj, delType, busDetails, lat, lng) => {
            const norm = getNormAddress(addressObj);
            if (norm && !normAddresses.has(norm)) {
                normAddresses.add(norm);
                uniqueAddresses.push({
                    patient_address: addressObj,
                    delivery_type: delType || 'Local',
                    bus_details: busDetails || null,
                    location_lat: lat || null,
                    location_lng: lng || null
                });
            }
        };

        // 1. Check Sales Orders History (ecogreensales_orders)
        const salesHistory = await db.query(
            `SELECT patient_address, delivery_type, bus_details, location_lat, location_lng 
             FROM ecogreensales_orders 
             WHERE (patient_contact_no = $1 OR patient_contact_no = $2)
               AND patient_address IS NOT NULL 
               AND status IN ('Delivered', 'Completed', 'Assigned')
             ORDER BY created_at DESC`,
            [cleanPhone, '91' + cleanPhone]
        );
        for (const row of salesHistory.rows) {
            addCandidate(row.patient_address, row.delivery_type, row.bus_details, row.location_lat, row.location_lng);
        }

        // 2. Check Manual Orders History (manual_orders)
        const manualHistory = await db.query(
            `SELECT address, mode_of_delivery, location_link, bus_travels_name, bus_driver_name, bus_driver_number, bus_number
             FROM manual_orders
             WHERE (customer_phone = $1 OR customer_phone = $2 OR ship_to_phone = $1 OR ship_to_phone = $2)
               AND address IS NOT NULL
               AND status IN ('Delivered', 'Completed', 'Assigned')
             ORDER BY created_at DESC`,
            [cleanPhone, '91' + cleanPhone]
        );
        for (const row of manualHistory.rows) {
            let lat = null, lng = null;
            const addressObj = {
                deliver_name: order.patient_name || '',
                address: row.address,
                locality: '',
                pincode: '',
                landmark: '',
                state: '',
                city: '',
                country: 'India',
                type: 'Home'
            };
            const busDetails = row.mode_of_delivery === 'Bus' ? {
                travels_name: row.bus_travels_name || '',
                driver_name: row.bus_driver_name || '',
                driver_number: row.bus_driver_number || '',
                bus_number: row.bus_number || ''
            } : null;
            addCandidate(addressObj, row.mode_of_delivery, busDetails, lat, lng);
        }

        // 3. Check Patients Table
        const patientData = await db.query(
            `SELECT name, addresses FROM patients 
             WHERE mobile = $1 OR mobile = $2 OR mobile = $3`,
            [cleanPhone, '91' + cleanPhone, cleanPhone.length === 10 ? cleanPhone.substring(2) : cleanPhone]
        );
        for (const row of patientData.rows) {
            let addrs = row.addresses;
            if (typeof addrs === 'string') {
                try { addrs = JSON.parse(addrs); } catch (e) { addrs = []; }
            }
            if (Array.isArray(addrs)) {
                for (const addr of addrs) {
                    if (addr && addr.address) {
                        const addressObj = {
                            deliver_name: order.patient_name || row.name || '',
                            address: addr.address,
                            locality: '',
                            pincode: '',
                            landmark: '',
                            state: '',
                            city: '',
                            country: 'India',
                            type: 'Home'
                        };
                        addCandidate(addressObj, 'Local', null, null, null);
                    }
                }
            }
        }

        if (uniqueAddresses.length === 0) {
            // NO ADDRESS FOUND -> Needs Review
            await db.query(`UPDATE ecogreensales_orders SET needs_review = TRUE, remark = 'New Customer' WHERE id = $1`, [order.id]);
            await db.query(`UPDATE ecogreen_sales_orders SET needs_review = TRUE, remark = 'New Customer' WHERE order_no = $1`, [order.order_no]);
            console.log(`⚠️ [Auto-Assign] Order ${order.order_no} has no previous address. Flagged needs_review = TRUE & remark = 'New Customer'`);
        } else if (uniqueAddresses.length === 1) {
            // SINGLE ADDRESS -> Auto fill & assign using workload balancing
            const matchedOrder = uniqueAddresses[0];
            const delType = matchedOrder.delivery_type || 'Local';
            const busDetails = matchedOrder.bus_details;
            const lat = matchedOrder.location_lat;
            const lng = matchedOrder.location_lng;
            const addressObj = typeof matchedOrder.patient_address === 'string' 
                ? JSON.parse(matchedOrder.patient_address) 
                : matchedOrder.patient_address;

            // Find active checked-in rider with the least workload
            const riderRes = await db.query(`
                SELECT e.id, 
                  (
                    (SELECT COUNT(*) FROM online_orders WHERE delivery_boy_id = e.id AND status NOT IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'FAILED', 'fail', 'not available', 'delivered', 'completed', 'cancelled', 'returned', 'failed')) +
                    (SELECT COUNT(*) FROM ecogreensales_orders WHERE delivery_boy_id = e.id AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Returned', 'Failed', 'fail', 'not available', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'FAILED', 'delivered', 'completed', 'cancelled', 'returned', 'failed')) +
                    (SELECT COUNT(*) FROM ecogreensales_invoices WHERE delivered_by_id = e.id AND status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Returned', 'Failed', 'fail', 'not available', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'FAILED', 'delivered', 'completed', 'cancelled', 'returned', 'failed'))
                  ) as pending_count
                FROM employees e
                WHERE e.department = 'Delivery' 
                  AND e.status = 'approved'
                  AND e.id::text IN (SELECT employee_id::text FROM attendance WHERE date = CURRENT_DATE AND checkout_timestamp IS NULL)
                ORDER BY pending_count ASC
                LIMIT 1
            `);

            if (riderRes.rows.length > 0) {
                const assignedBoyId = riderRes.rows[0].id;
                const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
                
                // Update ecogreensales_orders
                await db.query(`
                    UPDATE ecogreensales_orders
                    SET delivery_boy_id = $1,
                        delivery_type = $2,
                        bus_details = $3,
                        location_lat = $4,
                        location_lng = $5,
                        patient_address = $6,
                        delivery_otp = $7,
                        status = 'Assigned',
                        assigned_by = NULL,
                        delivery_assigned_user_type = 'employee',
                        needs_review = FALSE,
                        remark = NULL
                    WHERE id = $8
                `, [
                    assignedBoyId,
                    delType,
                    busDetails ? (typeof busDetails === 'string' ? busDetails : JSON.stringify(busDetails)) : null,
                    lat,
                    lng,
                    JSON.stringify(addressObj),
                    deliveryOtp,
                    order.id
                ]);

                // Update ecogreen_sales_orders
                await db.query(`
                    UPDATE ecogreen_sales_orders
                    SET delivery_boy_id = $1,
                        delivery_type = $2,
                        bus_details = $3,
                        location_lat = $4,
                        location_lng = $5,
                        patient_address = $6,
                        delivery_otp = $7,
                        status = 'Assigned',
                        assigned_by = NULL,
                        delivery_assigned_user_type = 'employee',
                        needs_review = FALSE,
                        remark = NULL
                    WHERE order_no = $8
                `, [
                    assignedBoyId,
                    delType,
                    busDetails ? (typeof busDetails === 'string' ? busDetails : JSON.stringify(busDetails)) : null,
                    lat,
                    lng,
                    JSON.stringify(addressObj),
                    deliveryOtp,
                    order.order_no
                ]);

                console.log(`🤖 [Auto-Assign] Assigned order ${order.order_no} to active workload-balanced rider ${assignedBoyId}`);

                // Push Notification
                try {
                    const empRes = await db.query('SELECT push_token FROM employees WHERE id = $1', [assignedBoyId]);
                    if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                        const { sendExpoPushNotification } = require('../utils/pushNotification');
                        sendExpoPushNotification(
                            empRes.rows[0].push_token, 
                            'New Auto-Assigned Order', 
                            `Order #${order.order_no} has been auto-assigned to you.`
                        );
                    }
                } catch (pe) {
                    console.error('Push notification error in auto assignment:', pe.message);
                }
            } else {
                console.log(`⚠️ [Auto-Assign] No active checked-in rider found for order ${order.order_no}`);
            }
        } else if (uniqueAddresses.length > 1) {
            // MULTIPLE ADDRESSES -> Needs Review
            await db.query(`UPDATE ecogreensales_orders SET needs_review = TRUE, remark = 'Multiple Address' WHERE id = $1`, [order.id]);
            await db.query(`UPDATE ecogreen_sales_orders SET needs_review = TRUE, remark = 'Multiple Address' WHERE order_no = $1`, [order.order_no]);
            console.log(`⚠️ [Auto-Assign] Order ${order.order_no} has multiple addresses. Flagged needs_review = TRUE and remark = 'Multiple Address'`);
        }
    } catch (err) {
        console.error(`❌ [Auto-Assign] Failed to auto assign order ${order.order_no}:`, err.message);
    }
}

const getAutoAssignEnabledAt = async () => {
  try {
    const res = await pool.query("SELECT value FROM settings WHERE key = 'sales_order_auto_assign_enabled_at'");
    if (res.rowCount === 0) return null;
    let val = res.rows[0].value;
    if (typeof val === 'string') {
      try { val = JSON.parse(val); } catch (e) {}
    }
    return val ? new Date(val) : null;
  } catch (e) {
    console.error('Error loading sales_order_auto_assign_enabled_at:', e.message);
    return null;
  }
};

async function runAutoAssignmentJob() {
  try {
    const toggleRes = await pool.query("SELECT value FROM settings WHERE key = 'sales_order_auto_assign_toggle'");
    const autoAssignToggleOn = toggleRes.rows.length > 0 ? (typeof toggleRes.rows[0].value === 'string' ? JSON.parse(toggleRes.rows[0].value) : toggleRes.rows[0].value) : false;

    if (!autoAssignToggleOn) return;

    const enabledAt = await getAutoAssignEnabledAt();
    if (!enabledAt) {
      console.log('[Auto-Assign Job] No enable timestamp found. Skipping.');
      return;
    }

    // Query pending orders created since enabledAt that do have an invoice ID
    const pendingOrdersRes = await pool.query(
      `SELECT * FROM ecogreensales_orders 
       WHERE status = 'Pending' 
         AND delivery_boy_id IS NULL 
         AND invoice_id IS NOT NULL 
         AND invoice_id != '' 
         AND needs_review IS NOT TRUE
         AND created_at >= $1
       ORDER BY created_at ASC`,
      [enabledAt]
    );

    if (pendingOrdersRes.rowCount === 0) {
      return;
    }

    console.log(`[Auto-Assign Job] Found ${pendingOrdersRes.rowCount} pending orders to auto-assign.`);

    const client = await pool.connect();
    try {
      for (const order of pendingOrdersRes.rows) {
        await tryAutoAssign(client, order);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error running Auto-Assign Job:', err.message);
  }
}

function startSalesOrderCron() {
    console.log("⏰ Starting 30-second interval Sales Order background sync...");
    // Run immediately on start
    syncSalesOrders();
    // Schedule every 30 seconds
    setInterval(syncSalesOrders, 30000);

    console.log("⏰ Starting 1-minute interval Sales Order Auto-Assignment cron...");
    // Run immediately on start
    runAutoAssignmentJob();
    // Schedule every 1 minute
    setInterval(runAutoAssignmentJob, 60000);
}

module.exports = {
    startSalesOrderCron,
    syncSalesOrders,
    runAutoAssignmentJob
};

const pool = require("../db");

async function initOnlineOrdersDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS online_orders (
            id SERIAL PRIMARY KEY,
            patient_id VARCHAR(255),
            patient_name VARCHAR(255),
            patient_mobile VARCHAR(20),
            manual_address TEXT,
            map_lat DECIMAL(10,8),
            map_lng DECIMAL(11,8),
            map_address TEXT,
            items JSONB,
            total_amount DECIMAL(10,2),
            status VARCHAR(50) DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("✅ online_orders table ensured in DB.");
    } catch (err) {
        console.error("Failed to create online_orders table:", err);
    }
}

exports.initOnlineOrdersDB = initOnlineOrdersDB;

exports.createOrder = async (req, res) => {
    try {
        const { patient_id, patient_name, patient_mobile, manual_address, map_lat, map_lng, map_address, items, total_amount } = req.body;
        
        const queryText = `
            INSERT INTO online_orders 
            (patient_id, patient_name, patient_mobile, manual_address, map_lat, map_lng, map_address, items, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING')
            RETURNING *;
        `;
        
        const values = [
            patient_id || '',
            patient_name || 'Guest Patient',
            patient_mobile || '',
            manual_address || '',
            map_lat || null,
            map_lng || null,
            map_address || '',
            JSON.stringify(items || []),
            total_amount || 0
        ];

        const { rows } = await pool.query(queryText, values);
        res.status(201).json({ success: true, message: 'Order created successfully', order: rows[0] });
    } catch (err) {
        console.error("Create order error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM online_orders';
        let values = [];
        
        if (status) {
            query += ' WHERE status = $1';
            values.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const { rows } = await pool.query(query, values);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error("Get orders error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, delivery_otp, pod_payment_mode } = req.body;
        
        if (status === 'DELIVERED') {
            const checkQuery = 'SELECT delivery_otp FROM online_orders WHERE id = $1';
            const checkRes = await pool.query(checkQuery, [id]);
            if (checkRes.rowCount > 0 && checkRes.rows[0].delivery_otp) {
                if (checkRes.rows[0].delivery_otp !== delivery_otp) {
                    return res.status(400).json({ success: false, message: 'Invalid OTP' });
                }
            }
        }
        
        const queryText = `
            UPDATE online_orders 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *;
        `;
        
        const { rows } = await pool.query(queryText, [status, id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        res.status(200).json({ success: true, message: 'Order status updated', order: rows[0] });
    } catch (err) {
        console.error("Update order status error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getOrdersByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;
        const query = 'SELECT * FROM online_orders WHERE patient_id = $1 ORDER BY created_at DESC';
        const { rows } = await pool.query(query, [patient_id]);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error("Get patient orders error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.assignDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const { delivery_boy_id } = req.body;
        
        // Generate 6-digit OTP
        const delivery_otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const queryText = `
            UPDATE online_orders 
            SET delivery_boy_id = $1, delivery_otp = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
        `;
        const { rows } = await pool.query(queryText, [delivery_boy_id, delivery_otp, id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
        
        try {
            const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
            if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                const { sendExpoPushNotification } = require('../utils/pushNotification');
                const ord = rows[0];
                
                let title = 'New Order Assigned';
                let body = `Order #${ord.id} has been assigned to you.`;
                
                const isBus = ord.delivery_type === 'Bus' || ord.mode_of_delivery === 'Bus';
                if (isBus) {
                  title = 'New Bus Delivery Assigned';
                  const bDate = ord.bus_date ? (typeof ord.bus_date === 'string' ? ord.bus_date.split('T')[0] : ord.bus_date.toISOString().split('T')[0]) : '';
                  body = `Bus order #${ord.id} has been assigned. Bus Date: ${bDate}, Time: ${ord.scheduled_time || ''}`;
                } else if (ord.is_scheduled) {
                  title = 'New Scheduled Order Assigned';
                  const sDate = ord.scheduled_date ? (typeof ord.scheduled_date === 'string' ? ord.scheduled_date.split('T')[0] : ord.scheduled_date.toISOString().split('T')[0]) : '';
                  body = `Scheduled order #${ord.id} has been assigned. Scheduled: ${sDate} ${ord.scheduled_time || ''}`;
                }
                
                sendExpoPushNotification(empRes.rows[0].push_token, title, body);
            }
        } catch(e) { console.error('Push error:', e); }

        res.status(200).json({ success: true, message: 'Delivery assigned', order: rows[0], delivery_otp });
    } catch (err) {
        console.error("Assign delivery error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

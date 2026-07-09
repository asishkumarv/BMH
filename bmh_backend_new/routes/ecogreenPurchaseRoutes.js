const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all ecogreen purchase orders
router.get('/all', async (req, res) => {
    try {
        const query = `
            SELECT * FROM ecogreenpurchase_orders 
            ORDER BY id DESC
        `;
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error fetching ecogreen POs:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get POs assigned to a specific delivery boy
router.get('/delivery/:boyId', async (req, res) => {
    try {
        const query = `
            SELECT * FROM ecogreenpurchase_orders 
            WHERE delivery_boy_id = $1 
            ORDER BY id DESC
        `;
        const result = await pool.query(query, [req.params.boyId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error("Error fetching assigned POs:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Assign delivery
router.post('/assign/:id', async (req, res) => {
    try {
        const { delivery_type, delivery_boy_id, bus_details, gps_location, address } = req.body;
        const id = req.params.id;

        const query = `
            UPDATE ecogreenpurchase_orders 
            SET 
                status = 'Assigned',
                delivery_type = $1,
                delivery_boy_id = $2,
                bus_details = $3,
                gps_location = $4,
                address = $5
            WHERE id = $6
            RETURNING *
        `;
        
        const values = [
            delivery_type,
            delivery_boy_id || null,
            bus_details ? JSON.stringify(bus_details) : null,
            gps_location || null,
            address || null,
            id
        ];

        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        const updatedPO = result.rows[0];
        if (delivery_boy_id) {
            try {
                const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
                if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
                    const { sendExpoPushNotification } = require('../utils/pushNotification');
                    let title = 'New Purchase Order Assigned';
                    let body = `Purchase Order #${updatedPO.id} has been assigned to you.`;
                    
                    const isBus = updatedPO.delivery_type === 'Bus';
                    if (isBus) {
                        title = 'New Bus Delivery Assigned';
                        const bDate = updatedPO.bus_date ? (typeof updatedPO.bus_date === 'string' ? updatedPO.bus_date.split('T')[0] : updatedPO.bus_date.toISOString().split('T')[0]) : '';
                        body = `Bus purchase order #${updatedPO.id} has been assigned. Bus Date: ${bDate}`;
                    }
                    
                    sendExpoPushNotification(empRes.rows[0].push_token, title, body);
                }
            } catch (e) {
                console.error('Push notification error:', e.message);
            }
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error assigning delivery:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update status
router.post('/status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const query = `
            UPDATE ecogreenpurchase_orders 
            SET status = $1 
            WHERE id = $2 
            RETURNING *
        `;
        const result = await pool.query(query, [status, req.params.id]);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

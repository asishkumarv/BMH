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
        const { delivery_type, delivery_boy_id, bus_details, gps_location, address, assigned_by } = req.body;
        const id = req.params.id;

        const query = `
            UPDATE ecogreenpurchase_orders 
            SET 
                status = 'Assigned',
                delivery_type = $1,
                delivery_boy_id = $2,
                bus_details = $3,
                gps_location = $4,
                address = $5,
                assigned_by = COALESCE($6::integer, assigned_by)
            WHERE id = $7
            RETURNING *
        `;
        
        const values = [
            delivery_type,
            delivery_boy_id || null,
            bus_details ? JSON.stringify(bus_details) : null,
            gps_location || null,
            address || null,
            assigned_by || null,
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
        const { status, submitted_to_id, submitted_to_name, submitted_to_role, submitted_to_dept } = req.body;
        let query;
        let values;

        if (submitted_to_id) {
            query = `
                UPDATE ecogreenpurchase_orders 
                SET status = $1::varchar, 
                    submitted_to_id = $2, 
                    submitted_to_name = $3, 
                    submitted_to_role = $4, 
                    submitted_to_dept = $5,
                    submitted_at = NOW(),
                    delivered_at = CASE WHEN $1::varchar = 'Delivered' THEN NOW() ELSE delivered_at END
                WHERE id = $6 
                RETURNING *
            `;
            values = [status, submitted_to_id, submitted_to_name, submitted_to_role, submitted_to_dept, req.params.id];
        } else {
            query = `
                UPDATE ecogreenpurchase_orders 
                SET status = $1::varchar,
                    delivered_at = CASE WHEN $1::varchar = 'Delivered' THEN NOW() ELSE delivered_at END
                WHERE id = $2 
                RETURNING *
            `;
            values = [status, req.params.id];
        }

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error updating status for PO:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update details (address, notes, modified_by metadata)
router.put('/update/:id', async (req, res) => {
    try {
        const { address, new_note, note_author, modified_by_id, modified_by_type, modified_by_name } = req.body;
        const id = req.params.id;

        // Fetch current details to append notes
        const currentPO = await pool.query('SELECT details FROM ecogreenpurchase_orders WHERE id = $1', [id]);
        if (currentPO.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        let updatedNotes = currentPO.rows[0].details || '[]';
        if (new_note) {
            let notesArr = [];
            try {
                notesArr = JSON.parse(updatedNotes);
                if (!Array.isArray(notesArr)) notesArr = [];
            } catch (e) {
                notesArr = [];
            }
            notesArr.push({
                text: new_note,
                author: note_author || 'System',
                timestamp: new Date().toISOString()
            });
            updatedNotes = JSON.stringify(notesArr);
        }

        const query = `
            UPDATE ecogreenpurchase_orders
            SET 
                address = COALESCE($1, address),
                details = $2,
                modified_by_id = $3,
                modified_by_type = $4,
                modified_by_name = $5
            WHERE id = $6
            RETURNING *
        `;
        const values = [address || null, updatedNotes, modified_by_id || null, modified_by_type || null, modified_by_name || null, id];
        const result = await pool.query(query, values);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Error updating Purchase Order details:", err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

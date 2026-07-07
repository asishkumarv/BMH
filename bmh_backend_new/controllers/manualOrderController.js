const pool = require('../db');

// Create Manual Order
exports.createOrder = async (req, res) => {
  try {
    const {
      order_no, invoice_no, amount, delivery_charge, mode_of_delivery,
      order_date, order_time, customer_phone, customer_name,
      ship_to_phone, ship_to_name, address, location_link, notes,
      bus_travels_name, bus_driver_name, bus_driver_number, bus_number
    } = req.body;

    const created_by_id = req.user?.id || req.body.created_by_id || null;
    const created_by_type = req.user?.role || req.body.created_by_type || 'Employee';

    // Generate random 4 digit OTP for local and scheduled deliveries
    const delivery_otp = (mode_of_delivery === 'Local' || mode_of_delivery === 'Schedule Delivery') ? Math.floor(1000 + Math.random() * 9000).toString() : null;

    const initialNotes = notes ? JSON.stringify([{
      text: notes,
      author: created_by_id || 'System',
      timestamp: new Date().toISOString()
    }]) : '[]';

    const insertQuery = `
      INSERT INTO manual_orders (
        order_no, invoice_no, amount, delivery_charge, mode_of_delivery,
        order_date, order_time, customer_phone, customer_name,
        ship_to_phone, ship_to_name, address, location_link,
        status, created_by_id, created_by_type, delivery_otp, notes,
        payment_mode, payment_txn_id, is_scheduled, scheduled_date, scheduled_time,
        bus_travels_name, bus_driver_name, bus_driver_number, bus_number,
        bus_date, est_reach_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Pending', $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *
    `;

    const values = [
      order_no || null, 
      invoice_no || null, 
      amount === '' ? null : amount, 
      delivery_charge === '' ? null : delivery_charge, 
      mode_of_delivery || null,
      order_date === '' ? null : order_date, 
      order_time === '' ? null : order_time, 
      customer_phone || null, 
      customer_name || null,
      ship_to_phone || null, 
      ship_to_name || null, 
      address || null, 
      location_link || null,
      created_by_id, 
      created_by_type, 
      delivery_otp, 
      initialNotes,
      req.body.payment_mode || null,
      req.body.payment_txn_id || null,
        req.body.is_scheduled || false,
        req.body.scheduled_date || null,
        req.body.scheduled_time || null,
        bus_travels_name || null,
        bus_driver_name || null,
        bus_driver_number || null,
        bus_number || null,
        req.body.bus_date || null,
        req.body.est_reach_time || req.body.arrival_time || null
    ];

    const result = await pool.query(insertQuery, values);

    // If an address is provided, try to update the patient's addresses array
    if (customer_phone && address) {
      try {
        const patientRes = await pool.query('SELECT id, addresses FROM patients WHERE mobile = $1', [customer_phone]);
        if (patientRes.rowCount > 0) {
          const patientId = patientRes.rows[0].id;
          let currentAddresses = patientRes.rows[0].addresses || [];
          
          if (typeof currentAddresses === 'string') {
            try { currentAddresses = JSON.parse(currentAddresses); } catch(e) { currentAddresses = []; }
          }
          
          const addressExists = currentAddresses.some(a => a.address === address);
          if (!addressExists) {
            currentAddresses.push({ address, location_link: location_link || '' });
            await pool.query('UPDATE patients SET addresses = $1 WHERE id = $2', [JSON.stringify(currentAddresses), patientId]);
          }
        }
      } catch (err) {
        console.error('Failed to update patient addresses:', err);
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// Get All Manual Orders
exports.getOrders = async (req, res) => {
  try {
    // Run schema migrations for timestamp tracking
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)`);

    // Optionally filter by customer_phone, delivery_boy_id, status
    const { customer_phone, delivery_boy_id, status } = req.query;
    let query = `
      SELECT mo.*,
        emp.full_name as delivery_boy_name, emp.profile_data as delivery_boy_profile, emp.mobile as delivery_boy_phone,
        cre.full_name as creator_name, cre.profile_data as creator_profile,
        admin.full_name as admin_creator_name, admin.image as admin_creator_profile
      FROM manual_orders mo
      LEFT JOIN employees emp ON mo.delivery_boy_id = emp.id::varchar
      LEFT JOIN employees cre ON mo.created_by_id = cre.id::varchar AND mo.created_by_type != 'Admin'
      LEFT JOIN department_admins admin ON mo.created_by_id = admin.id::varchar AND mo.created_by_type = 'Admin'
      WHERE 1=1
    `;
    const params = [];
    
    if (customer_phone) {
      params.push(customer_phone);
      query += ` AND mo.customer_phone = $${params.length}`;
    }
    if (delivery_boy_id) {
      params.push(delivery_boy_id);
      query += ` AND mo.delivery_boy_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND mo.status = $${params.length}`;
    }

    query += ' ORDER BY mo.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching manual orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// Update Order (Assign boy, update status, add payment/bus info, append notes)
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, delivery_boy_id,
      payment_mode, paid_amount, payment_txn_id, hand_over_to,
      bus_travels_name, bus_driver_name, bus_driver_number, bus_number,
      dispatch_time, est_reach_time, bus_date,
      new_note, note_author, delivery_otp, address, pod_payment_mode,
      scheduled_time, scheduled_date,
      customer_name, customer_phone, amount, order_no, location_link, mode_of_delivery,
      modified_by_id, modified_by_type, modified_by_name,
      invoice_no
    } = req.body;
    
    const payment_attachment = req.files && req.files.payment_attachment ? `/uploads/orders/${req.files.payment_attachment[0].filename}` : null;
    const bus_front_image = req.files && req.files.bus_front_image ? `/uploads/orders/${req.files.bus_front_image[0].filename}` : null;

    let updateFields = [];
    let params = [];

    // Simple helper
    const addField = (col, val) => {
      if (val !== undefined) {
        params.push(val === '' ? null : val);
        updateFields.push(`${col} = $${params.length}`);
      }
    };

    addField('status', status);
    addField('delivery_boy_id', delivery_boy_id);
    addField('payment_mode', payment_mode);
    addField('paid_amount', paid_amount);
    addField('payment_txn_id', payment_txn_id);
    addField('hand_over_to', hand_over_to);
    addField('bus_travels_name', bus_travels_name);
    addField('bus_driver_name', bus_driver_name);
    addField('bus_driver_number', bus_driver_number);
    addField('bus_number', bus_number);
    addField('dispatch_time', dispatch_time);
    addField('est_reach_time', est_reach_time);
    addField('bus_date', bus_date);
    addField('address', address);
    addField('pod_payment_mode', pod_payment_mode);
    addField('scheduled_time', scheduled_time);
    addField('scheduled_date', scheduled_date);
    addField('customer_name', customer_name);
    addField('customer_phone', customer_phone);
    addField('amount', amount);
    addField('order_no', order_no);
    addField('location_link', location_link);
    addField('mode_of_delivery', mode_of_delivery);
    addField('modified_by_id', modified_by_id);
    addField('modified_by_type', modified_by_type);
    addField('modified_by_name', modified_by_name);
    addField('invoice_no', invoice_no);
    
    // Automatically capture exact time transitions
    if (status === 'Picked Up') updateFields.push(`picked_up_at = CURRENT_TIMESTAMP`);
    if (status === 'Out for Delivery') updateFields.push(`started_at = CURRENT_TIMESTAMP`);
    if (status === 'Delivered') updateFields.push(`delivered_at = CURRENT_TIMESTAMP`);

    if (payment_attachment) addField('payment_attachment', payment_attachment);
    if (bus_front_image) addField('bus_front_image', bus_front_image);

    // Get current order to validate OTP if status is being changed to Delivered for a Local order
    const currentOrder = await pool.query('SELECT * FROM manual_orders WHERE id = $1', [id]);
    if (currentOrder.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status === 'Delivered' && (currentOrder.rows[0].mode_of_delivery === 'Local' || currentOrder.rows[0].mode_of_delivery === 'Schedule Delivery')) {
      if (currentOrder.rows[0].delivery_otp && currentOrder.rows[0].delivery_otp !== delivery_otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    }

    // If new note
    if (new_note) {
      let notesArr = [];
      try {
        notesArr = currentOrder.rows[0].notes || [];
        if (typeof notesArr === 'string') notesArr = JSON.parse(notesArr);
      } catch (e) {}

      notesArr.push({
        text: new_note,
        author: note_author || 'System',
        timestamp: new Date().toISOString()
      });
      params.push(JSON.stringify(notesArr));
      updateFields.push(`notes = $${params.length}::jsonb`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    const updateQuery = `
      UPDATE manual_orders
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${params.length}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    
    const updatedOrder = result.rows[0];
    
    if (delivery_boy_id && currentOrder.rows[0].delivery_boy_id != delivery_boy_id) {
       try {
           const empRes = await pool.query('SELECT push_token FROM employees WHERE id = $1', [delivery_boy_id]);
           if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
              const { sendExpoPushNotification } = require('../utils/pushNotification');
              
              let shouldPushNow = true;
              if (updatedOrder.is_scheduled && updatedOrder.scheduled_date && updatedOrder.scheduled_time) {
                 const sDate = typeof updatedOrder.scheduled_date === 'string' ? updatedOrder.scheduled_date.split('T')[0] : updatedOrder.scheduled_date.toISOString().split('T')[0];
                 const scheduledDateTime = new Date(`${sDate}T${updatedOrder.scheduled_time}`);
                 const alarmTime = new Date(scheduledDateTime.getTime() - 20 * 60000);
                 if (alarmTime > new Date()) {
                    shouldPushNow = false;
                 }
              }
              
              if (shouldPushNow) {
                 sendExpoPushNotification(empRes.rows[0].push_token, 'New Manual Order Assigned', `Order #${updatedOrder.order_no || updatedOrder.id} has been assigned to you.`);
              }
           }
       } catch(e) { console.error('Push error:', e); }
    }
    
    // Wallet update logic for POD Cash Orders
    if (updatedOrder.status === 'Delivered' && updatedOrder.payment_mode === 'POD' && updatedOrder.delivery_boy_id) {
      if (updatedOrder.pod_payment_mode === 'Cash') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        // Optionally add a transaction
        await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
          [updatedOrder.delivery_boy_id, 'cash_collection', amt, `Order ${updatedOrder.order_no} Delivered (POD Cash)`, 'completed', 'Cash']);
      } else if (updatedOrder.pod_payment_mode === 'Online') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        await pool.query('INSERT INTO wallet_transactions (employee_id, type, amount, note, status, payment_mode) VALUES ($1, $2, $3, $4, $5, $6)', 
          [updatedOrder.delivery_boy_id, 'online_collection', amt, `Order ${updatedOrder.order_no} Delivered (POD Online)`, 'completed', 'Online']);
      }
    }
    
    res.json({ success: true, data: updatedOrder });

  } catch (error) {
    console.error('Error updating manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

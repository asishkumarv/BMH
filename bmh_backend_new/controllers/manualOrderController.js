const pool = require('../db');

// Create Manual Order
exports.createOrder = async (req, res) => {
  try {
    const {
      order_no, invoice_no, amount, delivery_charge, mode_of_delivery,
      order_date, order_time, customer_phone, customer_name,
      ship_to_phone, ship_to_name, address, location_link, notes
    } = req.body;

    const created_by_id = req.user?.id || req.body.created_by_id || null;
    const created_by_type = req.user?.role || req.body.created_by_type || 'Employee';

    // Generate random 4 digit OTP for local delivery
    const delivery_otp = mode_of_delivery === 'Local' ? Math.floor(1000 + Math.random() * 9000).toString() : null;

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
        status, created_by_id, created_by_type, delivery_otp, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Pending', $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      order_no, invoice_no, amount, delivery_charge, mode_of_delivery,
      order_date, order_time, customer_phone, customer_name,
      ship_to_phone, ship_to_name, address, location_link,
      created_by_id, created_by_type, delivery_otp, initialNotes
    ];

    const result = await pool.query(insertQuery, values);
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Error creating manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// Get All Manual Orders
exports.getOrders = async (req, res) => {
  try {
    // Optionally filter by customer_phone, delivery_boy_id, status
    const { customer_phone, delivery_boy_id, status } = req.query;
    let query = `
      SELECT mo.*,
        emp.full_name as delivery_boy_name, emp.profile_data as delivery_boy_profile,
        cre.full_name as creator_name, cre.profile_data as creator_profile,
        admin.full_name as admin_creator_name, admin.image as admin_creator_profile
      FROM manual_orders mo
      LEFT JOIN employees emp ON mo.delivery_boy_id = emp.id
      LEFT JOIN employees cre ON mo.created_by_id = cre.id AND mo.created_by_type != 'Admin'
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
      dispatch_time, est_reach_time,
      new_note, note_author, delivery_otp
    } = req.body;
    
    const payment_attachment = req.files && req.files.payment_attachment ? `/uploads/orders/${req.files.payment_attachment[0].filename}` : null;
    const bus_front_image = req.files && req.files.bus_front_image ? `/uploads/orders/${req.files.bus_front_image[0].filename}` : null;

    let updateFields = [];
    let params = [];

    // Simple helper
    const addField = (col, val) => {
      if (val !== undefined) {
        params.push(val);
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
    
    if (payment_attachment) addField('payment_attachment', payment_attachment);
    if (bus_front_image) addField('bus_front_image', bus_front_image);

    // Get current order to validate OTP if status is being changed to Delivered for a Local order
    const currentOrder = await pool.query('SELECT * FROM manual_orders WHERE id = $1', [id]);
    if (currentOrder.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status === 'Delivered' && currentOrder.rows[0].mode_of_delivery === 'Local') {
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

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Error updating manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

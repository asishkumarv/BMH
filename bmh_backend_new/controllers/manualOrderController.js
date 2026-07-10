const pool = require('../db');
const fs = require('fs');

const logErrorToFile = (err, context) => {
  try {
    const time = new Date().toISOString();
    const message = `[${time}] [${context}] Error: ${err.stack || err}\n`;
    fs.appendFileSync('c:/Users/Lohitha Asish/Desktop/BMH/bmh_backend_new/error_logs.txt', message, 'utf8');
  } catch(e) {}
};

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

    // Save new bus route if mode_of_delivery is Bus and it doesn't exist
    if (mode_of_delivery === 'Bus' && bus_number) {
      try {
        const busCheck = await pool.query('SELECT id FROM buses WHERE LOWER(bus_number) = LOWER($1)', [bus_number.trim()]);
        if (busCheck.rowCount === 0) {
          await pool.query(
            `INSERT INTO buses (bus_name, bus_number, parcel_contact_person, mobile_no, status, destination) 
             VALUES ($1, $2, $3, $4, 'Active', $5)`,
            [bus_travels_name || null, bus_number.trim(), bus_driver_name || null, bus_driver_number || null, address || null]
          );
        }
      } catch (err) {
        console.error('Failed to save new bus:', err);
        logErrorToFile(err, 'createOrder - save bus');
      }
    }

    // If an address is provided, update patient's addresses array or create a new patient
    if (customer_phone && address) {
      try {
        const patientRes = await pool.query('SELECT id, addresses FROM patients WHERE mobile = $1', [customer_phone]);
        if (patientRes.rowCount > 0) {
          const patientId = patientRes.rows[0].id;
          let currentAddresses = patientRes.rows[0].addresses || [];
          
          if (typeof currentAddresses === 'string') {
            try { currentAddresses = JSON.parse(currentAddresses); } catch(e) { currentAddresses = []; }
          }
          
          let addressObj = currentAddresses.find(a => a && a.address === address);
          if (addressObj) {
            if (location_link && (!addressObj.location_link || addressObj.location_link !== location_link)) {
              addressObj.location_link = location_link;
              await pool.query('UPDATE patients SET addresses = $1 WHERE id = $2', [JSON.stringify(currentAddresses), patientId]);
            }
          } else {
            currentAddresses.push({ address, location_link: location_link || '' });
            await pool.query('UPDATE patients SET addresses = $1 WHERE id = $2', [JSON.stringify(currentAddresses), patientId]);
          }
        } else {
          // Create new patient!
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash(customer_phone, 10);
          const initialAddress = [{ address, location_link: location_link || '' }];
          await pool.query(
            'INSERT INTO patients (name, mobile, password, addresses) VALUES ($1, $2, $3, $4)',
            [customer_name || 'Customer', customer_phone, hashedPassword, JSON.stringify(initialAddress)]
          );
        }
      } catch (err) {
        console.error('Failed to update patient addresses:', err);
        logErrorToFile(err, 'createOrder - patient addresses');
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating manual order:', error);
    logErrorToFile(error, 'createOrder - main');
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// Get All Manual Orders with Pagination & Global Search
exports.getOrders = async (req, res) => {
  try {
    // Run schema migrations for timestamp tracking
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR(50)`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_type VARCHAR(50)`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR(255)`);

    const { customer_phone, delivery_boy_id, status, search, fromDate, toDate, page = 1, limit = 50 } = req.query;
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
    if (fromDate) {
      params.push(fromDate);
      query += ` AND mo.created_at::date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      query += ` AND mo.created_at::date <= $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        mo.customer_name ILIKE $${params.length} OR 
        mo.customer_phone ILIKE $${params.length} OR 
        mo.order_no ILIKE $${params.length} OR 
        mo.invoice_no ILIKE $${params.length}
      )`;
    }

    // Get total count for pagination metadata
    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS temp`;
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Apply sorting & pagination
    query += ' ORDER BY mo.created_at DESC';
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;
    
    params.push(parsedLimit);
    query += ` LIMIT $${params.length}`;
    
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(totalCount / parsedLimit)
      }
    });
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
               
               let title = 'New Order Assigned';
               let body = `Order #${updatedOrder.order_no || updatedOrder.id} has been assigned to you.`;
               
               const isBus = updatedOrder.delivery_type === 'Bus' || updatedOrder.mode_of_delivery === 'Bus';
               if (isBus) {
                 title = 'New Bus Delivery Assigned';
                 const bDate = updatedOrder.bus_date ? (typeof updatedOrder.bus_date === 'string' ? updatedOrder.bus_date.split('T')[0] : updatedOrder.bus_date.toISOString().split('T')[0]) : '';
                 body = `Bus order #${updatedOrder.order_no || updatedOrder.id} has been assigned. Bus Date: ${bDate}, Time: ${updatedOrder.scheduled_time || ''}`;
               } else if (updatedOrder.is_scheduled) {
                 title = 'New Scheduled Order Assigned';
                 const sDate = updatedOrder.scheduled_date ? (typeof updatedOrder.scheduled_date === 'string' ? updatedOrder.scheduled_date.split('T')[0] : updatedOrder.scheduled_date.toISOString().split('T')[0]) : '';
                 body = `Scheduled order #${updatedOrder.order_no || updatedOrder.id} has been assigned. Scheduled: ${sDate} ${updatedOrder.scheduled_time || ''}`;
               }
               
               sendExpoPushNotification(empRes.rows[0].push_token, title, body);
            }
        } catch(e) { console.error('Push error:', e); }
    }
    
    // Wallet update logic for POD Cash Orders
    if (updatedOrder.status === 'Delivered' && updatedOrder.payment_mode === 'POD' && updatedOrder.delivery_boy_id) {
      if (updatedOrder.pod_payment_mode === 'Cash') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        // Optionally add a transaction
        await pool.query(
          `INSERT INTO wallet_transactions (
            employee_id, type, amount, note, status, payment_mode, 
            order_no, invoice_no, customer_name, customer_phone, delivery_method, 
            cash_amount, online_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, 
          [
            updatedOrder.delivery_boy_id, 
            'cash_collection', 
            amt, 
            `Order ${updatedOrder.order_no || updatedOrder.id} Delivered (POD Cash)`, 
            'completed', 
            'Cash',
            updatedOrder.order_no || updatedOrder.id,
            updatedOrder.invoice_no || '',
            updatedOrder.customer_name || '',
            updatedOrder.customer_phone || '',
            updatedOrder.mode_of_delivery || '',
            amt,
            0
          ]
        );
      } else if (updatedOrder.pod_payment_mode === 'Online') {
        const amt = updatedOrder.amount || 0;
        await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [amt, updatedOrder.delivery_boy_id]);
        
        await pool.query(
          `INSERT INTO wallet_transactions (
            employee_id, type, amount, note, status, payment_mode, 
            order_no, invoice_no, customer_name, customer_phone, delivery_method, 
            cash_amount, online_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, 
          [
            updatedOrder.delivery_boy_id, 
            'online_collection', 
            amt, 
            `Order ${updatedOrder.order_no || updatedOrder.id} Delivered (POD Online)`, 
            'completed', 
            'Online',
            updatedOrder.order_no || updatedOrder.id,
            updatedOrder.invoice_no || '',
            updatedOrder.customer_name || '',
            updatedOrder.customer_phone || '',
            updatedOrder.mode_of_delivery || '',
            0,
            amt
          ]
        );
      }
    }
    // Save new bus route on manual order update if mode_of_delivery is Bus
    const finalBusTravels = bus_travels_name !== undefined ? bus_travels_name : currentOrder.rows[0].bus_travels_name;
    const finalBusNo = bus_number !== undefined ? bus_number : currentOrder.rows[0].bus_number;
    const finalBusDriver = bus_driver_name !== undefined ? bus_driver_name : currentOrder.rows[0].bus_driver_name;
    const finalBusPhone = bus_driver_number !== undefined ? bus_driver_number : currentOrder.rows[0].bus_driver_number;
    const finalDeliveryMode = mode_of_delivery !== undefined ? mode_of_delivery : currentOrder.rows[0].mode_of_delivery;
    const finalAddress = address !== undefined ? address : currentOrder.rows[0].address;

    if (finalDeliveryMode === 'Bus' && finalBusNo) {
      try {
        const busCheck = await pool.query('SELECT id FROM buses WHERE LOWER(bus_number) = LOWER($1)', [finalBusNo.trim()]);
        if (busCheck.rowCount === 0) {
          await pool.query(
            `INSERT INTO buses (bus_name, bus_number, parcel_contact_person, mobile_no, status, destination) 
             VALUES ($1, $2, $3, $4, 'Active', $5)`,
            [finalBusTravels || null, finalBusNo.trim(), finalBusDriver || null, finalBusPhone || null, finalAddress || null]
          );
        }
      } catch (err) {
        console.error('Failed to save new bus on update:', err);
      }
    }

    // Update patient address / create patient on manual order update
    const finalPhone = customer_phone !== undefined ? customer_phone : currentOrder.rows[0].customer_phone;
    const finalName = customer_name !== undefined ? customer_name : currentOrder.rows[0].customer_name;
    const finalLink = location_link !== undefined ? location_link : currentOrder.rows[0].location_link;

    if (finalPhone && finalAddress) {
      try {
        const patientRes = await pool.query('SELECT id, addresses FROM patients WHERE mobile = $1', [finalPhone]);
        if (patientRes.rowCount > 0) {
          const patientId = patientRes.rows[0].id;
          let currentAddresses = patientRes.rows[0].addresses || [];
          if (typeof currentAddresses === 'string') {
            try { currentAddresses = JSON.parse(currentAddresses); } catch(e) { currentAddresses = []; }
          }
          let addressObj = currentAddresses.find(a => a && a.address === finalAddress);
          if (addressObj) {
            if (finalLink && (!addressObj.location_link || addressObj.location_link !== finalLink)) {
              addressObj.location_link = finalLink;
              await pool.query('UPDATE patients SET addresses = $1, name = COALESCE($2, name) WHERE id = $3', [JSON.stringify(currentAddresses), finalName || null, patientId]);
            }
          } else {
            currentAddresses.push({ address: finalAddress, location_link: finalLink || '' });
            await pool.query('UPDATE patients SET addresses = $1, name = COALESCE($2, name) WHERE id = $3', [JSON.stringify(currentAddresses), finalName || null, patientId]);
          }
        } else {
          // Create new patient!
          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash(finalPhone, 10);
          const initialAddress = [{ address: finalAddress, location_link: finalLink || '' }];
          await pool.query(
            'INSERT INTO patients (name, mobile, password, addresses) VALUES ($1, $2, $3, $4)',
            [finalName || 'Customer', finalPhone, hashedPassword, JSON.stringify(initialAddress)]
          );
        }
      } catch (err) {
        console.error('Failed to update patient addresses on update:', err);
      }
    }

    res.json({ success: true, data: updatedOrder });

  } catch (error) {
    console.error('Error updating manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const orderCheck = await pool.query('SELECT status FROM manual_orders WHERE id = $1', [id]);
    if (orderCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    const restrictedStatuses = ['picked up', 'out for delivery', 'delivered', 'completed'];
    if (restrictedStatuses.includes(currentStatus.toLowerCase())) {
      return res.status(400).json({ 
        success: false, 
        message: `Orders with status '${currentStatus}' cannot be deleted.` 
      });
    }

    const deleteResult = await pool.query('DELETE FROM manual_orders WHERE id = $1 RETURNING *', [id]);
    
    res.json({ 
      success: true, 
      message: 'Order deleted successfully', 
      deletedOrder: deleteResult.rows[0] 
    });

  } catch (error) {
    console.error('Error deleting manual order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
};

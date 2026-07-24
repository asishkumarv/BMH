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
      WITH combined_orders AS (
        SELECT 
          mo.id, mo.order_no, mo.invoice_no, mo.amount, mo.delivery_charge, mo.mode_of_delivery,
          mo.order_date, mo.order_time, mo.customer_phone, mo.customer_name,
          mo.ship_to_phone, mo.ship_to_name, mo.address, mo.location_link,
          mo.status, mo.created_by_id, mo.created_by_type, mo.delivery_otp, mo.notes,
          mo.payment_mode, mo.payment_txn_id,
          mo.pod_payment_mode, mo.cash_amount, mo.online_amount, mo.credit_amount,
          mo.is_scheduled, mo.scheduled_date, mo.scheduled_time,
          mo.bus_travels_name, mo.bus_driver_name, mo.bus_driver_number, mo.bus_number,
          mo.bus_date, mo.est_reach_time, mo.picked_up_at, mo.started_at, mo.delivered_at,
          mo.modified_by_id, mo.modified_by_type, mo.modified_by_name, mo.payment_re_edited_by,
          'manual_order' as order_source_type,
          NULL as submitted_to_id, NULL as submitted_to_name, NULL as submitted_to_role, NULL as submitted_to_dept,
          mo.delivery_boy_id,
          mo.created_at
        FROM manual_orders mo
        
        UNION ALL
        
        SELECT 
          oo.id,
          oo.id::varchar as order_no,
          NULL::varchar as invoice_no,
          oo.total_amount::numeric as amount,
          0.00::numeric as delivery_charge,
          'Local'::varchar as mode_of_delivery,
          oo.created_at::date as order_date,
          oo.created_at::time as order_time,
          oo.patient_mobile as customer_phone,
          oo.patient_name as customer_name,
          NULL::varchar as ship_to_phone,
          oo.patient_name as ship_to_name,
          oo.manual_address as address,
          NULL::text as location_link,
          oo.status,
          oo.assigned_by::varchar as created_by_id,
          'Employee'::varchar as created_by_type,
          oo.delivery_otp,
          COALESCE(oo.notes, '[]')::jsonb as notes,
          oo.pod_payment_mode as payment_mode,
          NULL::varchar as payment_txn_id,
          oo.pod_payment_mode, oo.cash_amount, oo.online_amount, oo.credit_amount,
          oo.is_scheduled,
          oo.scheduled_date,
          oo.scheduled_time,
          NULL::varchar as bus_travels_name,
          NULL::varchar as bus_driver_name,
          NULL::varchar as bus_driver_number,
          NULL::varchar as bus_number,
          NULL::date as bus_date,
          NULL::varchar as est_reach_time,
          NULL::timestamp as picked_up_at,
          NULL::timestamp as started_at,
          oo.delivered_at,
          oo.modified_by_id,
          oo.modified_by_type,
          oo.modified_by_name, oo.payment_re_edited_by,
          'online_order'::varchar as order_source_type,
          NULL::varchar as submitted_to_id,
          NULL::varchar as submitted_to_name,
          NULL::varchar as submitted_to_role,
          NULL::varchar as submitted_to_dept,
          oo.delivery_boy_id::varchar as delivery_boy_id,
          oo.created_at
        FROM online_orders oo
        WHERE oo.delivery_boy_id IS NOT NULL
        
        UNION ALL
        
        SELECT 
          so.id,
          so.id::varchar as order_no,
          so.ip_no as invoice_no,
          so.order_total::numeric as amount,
          0.00::numeric as delivery_charge,
          so.delivery_type as mode_of_delivery,
          so.ord_date as order_date,
          so.ord_time as order_time,
          so.mobile_no as customer_phone,
          so.patient_name as customer_name,
          NULL::varchar as ship_to_phone,
          so.patient_name as ship_to_name,
          so.patient_address as address,
          NULL::text as location_link,
          so.status,
          so.assigned_by::varchar as created_by_id,
          'Employee'::varchar as created_by_type,
          so.delivery_otp,
          COALESCE(so.notes, '[]')::jsonb as notes,
          NULL::varchar as payment_mode,
          NULL::varchar as payment_txn_id,
          so.pod_payment_mode, so.cash_amount, so.online_amount, so.credit_amount,
          false::boolean as is_scheduled,
          NULL::date as scheduled_date,
          NULL::time as scheduled_time,
          COALESCE(so.bus_details->>'bus_name', so.bus_details->>'waybill_number')::varchar as bus_travels_name,
          (so.bus_details->>'driver_name')::varchar as bus_driver_name,
          (so.bus_details->>'driver_number')::varchar as bus_driver_number,
          (so.bus_details->>'bus_number')::varchar as bus_number,
          CASE WHEN so.bus_details->>'bus_date' IS NOT NULL THEN (so.bus_details->>'bus_date')::date ELSE NULL::date END as bus_date,
          (so.bus_details->>'arrival_time')::varchar as est_reach_time,
          NULL::timestamp as picked_up_at,
          NULL::timestamp as started_at,
          so.delivered_at,
          so.modified_by_id,
          so.modified_by_type,
          so.modified_by_name, so.payment_re_edited_by,
          'sales_order'::varchar as order_source_type,
          NULL::varchar as submitted_to_id,
          NULL::varchar as submitted_to_name,
          NULL::varchar as submitted_to_role,
          NULL::varchar as submitted_to_dept,
          so.delivery_boy_id::varchar as delivery_boy_id,
          so.created_at
        FROM ecogreen_sales_orders so
        WHERE so.delivery_boy_id IS NOT NULL
      )
      SELECT co.*,
        emp.full_name as delivery_boy_name, emp.profile_data as delivery_boy_profile, emp.mobile as delivery_boy_phone,
        cre.full_name as creator_name, cre.profile_data as creator_profile,
        admin.full_name as admin_creator_name, admin.image as admin_creator_profile
      FROM combined_orders co
      LEFT JOIN employees emp ON co.delivery_boy_id = emp.id::varchar
      LEFT JOIN employees cre ON co.created_by_id = cre.id::varchar AND co.created_by_type != 'Admin'
      LEFT JOIN department_admins admin ON co.created_by_id = admin.id::varchar AND co.created_by_type = 'Admin'
      WHERE 1=1
    `;
    const params = [];
    
    if (customer_phone) {
      params.push(customer_phone);
      query += ` AND co.customer_phone = $${params.length}`;
    }
    if (delivery_boy_id) {
      params.push(delivery_boy_id);
      query += ` AND co.delivery_boy_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND co.status = $${params.length}`;
    }
    if (fromDate) {
      params.push(fromDate);
      query += ` AND co.created_at::date >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      query += ` AND co.created_at::date <= $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        co.customer_name ILIKE $${params.length} OR 
        co.customer_phone ILIKE $${params.length} OR 
        co.order_no ILIKE $${params.length} OR 
        co.invoice_no ILIKE $${params.length}
      )`;
    }

    // Get total count for pagination metadata
    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS temp`;
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Apply sorting & pagination
    query += ' ORDER BY co.created_at DESC';
    
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
      invoice_no, ship_to_name, ship_to_phone,
      delivery_assigned_user_type, // Accept this
      cash_amount, online_amount, credit_amount
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

    let boyId = delivery_boy_id;
    let userType = delivery_assigned_user_type || 'employee';
    if (typeof boyId === 'string' && boyId.startsWith('SA-')) {
      boyId = boyId.replace('SA-', '');
      userType = 'sub_admin';
    }
    const boyIdInt = boyId ? parseInt(boyId, 10) : null;

    addField('status', status);
    if (delivery_boy_id !== undefined) {
      addField('delivery_boy_id', boyIdInt);
      addField('delivery_assigned_user_type', userType);
    }
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
    addField('ship_to_name', ship_to_name);
    addField('ship_to_phone', ship_to_phone);
    addField('amount', amount);
    addField('order_no', order_no);
    addField('location_link', location_link);
    addField('mode_of_delivery', mode_of_delivery);
    addField('modified_by_id', modified_by_id);
    addField('modified_by_type', modified_by_type);
    addField('modified_by_name', modified_by_name);
    addField('invoice_no', invoice_no);
    addField('cash_amount', cash_amount);
    addField('online_amount', online_amount);
    addField('credit_amount', credit_amount);
    
    // Automatically capture exact time transitions
    if (status === 'Picked Up') updateFields.push(`picked_up_at = CURRENT_TIMESTAMP`);
    if (status === 'Out for Delivery') updateFields.push(`started_at = CURRENT_TIMESTAMP`);
    if (status === 'Delivered') updateFields.push(`delivered_at = CURRENT_TIMESTAMP`);

    if (payment_attachment) addField('payment_attachment', payment_attachment);
    if (bus_front_image) addField('bus_front_image', bus_front_image);

    // Get current order to validate OTP if status is being changed to Delivered
    const currentOrder = await pool.query('SELECT * FROM manual_orders WHERE id = $1', [id]);
    if (currentOrder.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Auto-generate delivery_otp if a boy is assigned and it has none
    if (delivery_boy_id && currentOrder.rows[0].delivery_boy_id != boyIdInt) {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      addField('delivery_otp', generatedOtp);
    }

    if ((status === 'Delivered' || status === 'Cancelled') && (
      currentOrder.rows[0].mode_of_delivery === 'Local' || 
      currentOrder.rows[0].mode_of_delivery === 'Schedule Delivery' ||
      currentOrder.rows[0].mode_of_delivery === 'Store'
    )) {
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

    const wasDelivered = currentOrder.rows[0].status && currentOrder.rows[0].status.toLowerCase() === 'delivered';
    if (wasDelivered) {
      const editorName = req.body.modified_by_name || req.body.note_author || 'System';
      params.push(editorName);
      updateFields.push(`payment_re_edited_by = $${params.length}`);
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
    
    if (boyIdInt && currentOrder.rows[0].delivery_boy_id != boyIdInt) {
        try {
            const tokenQuery = userType === 'sub_admin' 
              ? 'SELECT push_token FROM department_admins WHERE id = $1' 
              : 'SELECT push_token FROM employees WHERE id = $1';
            const empRes = await pool.query(tokenQuery, [boyIdInt]);
            if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
               const { sendExpoPushNotification } = require('../utils/pushNotification');
               
               let title = 'New Order Assigned';
               let body = `Order #${updatedOrder.order_no || updatedOrder.id} has been assigned to you.`;
               
               const isStore = updatedOrder.delivery_type === 'Store' || updatedOrder.mode_of_delivery === 'Store' || updatedOrder.delivery_type === 'Counter' || updatedOrder.mode_of_delivery === 'Counter';
               const isBus = updatedOrder.delivery_type === 'Bus' || updatedOrder.mode_of_delivery === 'Bus';
               if (isStore) {
                 title = 'New Store/Counter Order Assigned';
                 body = `Order #${updatedOrder.order_no || updatedOrder.id} has been assigned for Store/Counter delivery.`;
               } else if (isBus) {
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
    
    // Wallet update logic for POD Cash/Online/Split/Credit Orders (supports sub-admins and employees)
    const isPOD = updatedOrder.payment_mode === 'POD' || 
                  updatedOrder.payment_mode === 'COD' || 
                  updatedOrder.payment_mode === 'Cash' || 
                  updatedOrder.payment_mode === 'Online' || 
                  updatedOrder.payment_mode === 'Split';

    if (updatedOrder.status === 'Delivered' && isPOD && updatedOrder.delivery_boy_id) {
      let targetEmployeeId = updatedOrder.delivery_boy_id.toString();
      if (updatedOrder.delivery_assigned_user_type === 'sub_admin') {
        targetEmployeeId = 'SA-' + targetEmployeeId;
      }
      
      let cAmt = parseFloat(updatedOrder.cash_amount || 0);
      let oAmt = parseFloat(updatedOrder.online_amount || 0);
      const crAmt = parseFloat(updatedOrder.credit_amount || 0);

      // Fallback for old system / unspecified split amounts
      const mode = updatedOrder.pod_payment_mode || updatedOrder.payment_mode || 'Cash';
      if (cAmt === 0 && oAmt === 0) {
        const totalPaid = parseFloat(updatedOrder.paid_amount || updatedOrder.amount || 0);
        if (mode === 'Online') {
          oAmt = totalPaid;
        } else if (mode === 'Split') {
          cAmt = Math.floor(totalPaid / 2);
          oAmt = totalPaid - cAmt;
        } else {
          cAmt = totalPaid;
        }
      }

      // Check if a transaction already exists for this order
      const txCheck = await pool.query(
        'SELECT * FROM wallet_transactions WHERE order_no = $1 OR (invoice_no = $2 AND invoice_no <> \'\')',
        [(updatedOrder.order_no || updatedOrder.id || '').toString(), (updatedOrder.invoice_no || '').toString()]
      );

      const txType = mode === 'Split' ? 'split_collection' : (mode === 'Online' ? 'online_collection' : 'cash_collection');
      const txMode = mode;
      const totalPaid = cAmt + oAmt;

      if (txCheck.rowCount > 0) {
        const existingTx = txCheck.rows[0];
        const oldCash = parseFloat(existingTx.cash_amount || 0);
        const oldOnline = parseFloat(existingTx.online_amount || 0);
        const oldEmpId = existingTx.employee_id;

        // Update the existing transaction
        await pool.query(
          `UPDATE wallet_transactions 
           SET employee_id = $1, type = $2, amount = $3, 
               note = $4, payment_mode = $5, payment_txn_id = $6,
               cash_amount = $7, online_amount = $8, credit_amount = $9
           WHERE id = $10`,
          [
            targetEmployeeId,
            txType,
            totalPaid,
            `Order ${updatedOrder.order_no || updatedOrder.id} Delivered (${txMode}) (Updated)`,
            txMode,
            payment_txn_id || null,
            cAmt,
            oAmt,
            crAmt,
            existingTx.id
          ]
        );

        // Deduct old values from the previous employee's wallet
        if (oldCash > 0) {
          await pool.query('UPDATE employee_wallets SET cash_in_hand = GREATEST(0, cash_in_hand - $1) WHERE employee_id = $2', [oldCash, oldEmpId]);
        }
        if (oldOnline > 0) {
          await pool.query('UPDATE employee_wallets SET online_collected = GREATEST(0, online_collected - $1) WHERE employee_id = $2', [oldOnline, oldEmpId]);
        }

        // Credit new values to the current employee's wallet
        const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [targetEmployeeId]);
        if (wCheck.rowCount === 0) {
          await pool.query(
            'INSERT INTO employee_wallets (employee_id, cash_in_hand, online_collected, balance) VALUES ($1, 0, 0, 0)',
            [targetEmployeeId]
          );
        }
        if (cAmt > 0) {
          await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [cAmt, targetEmployeeId]);
        }
        if (oAmt > 0) {
          await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [oAmt, targetEmployeeId]);
        }
      } else {
        // Create new wallet if not exists
        const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [targetEmployeeId]);
        if (wCheck.rowCount === 0) {
          await pool.query(
            'INSERT INTO employee_wallets (employee_id, cash_in_hand, online_collected, balance) VALUES ($1, 0, 0, 0)',
            [targetEmployeeId]
          );
        }

        if (cAmt > 0 || oAmt > 0) {
          await pool.query(
            `INSERT INTO wallet_transactions (
              employee_id, type, amount, note, status, payment_mode, payment_txn_id,
              order_no, invoice_no, customer_name, customer_phone, delivery_method, 
              cash_amount, online_amount, credit_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT DO NOTHING`, 
            [
              targetEmployeeId, 
              txType, 
              totalPaid, 
              `Order ${updatedOrder.order_no || updatedOrder.id} Delivered (${txMode})`, 
              'completed', 
              txMode,
              payment_txn_id || null,
              updatedOrder.order_no || updatedOrder.id,
              updatedOrder.invoice_no || '',
              updatedOrder.ship_to_name || updatedOrder.customer_name || '',
              updatedOrder.ship_to_phone || updatedOrder.customer_phone || '',
              updatedOrder.mode_of_delivery || '',
              cAmt,
              oAmt,
              crAmt
            ]
          );

          if (cAmt > 0) {
            await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [cAmt, targetEmployeeId]);
          }
          if (oAmt > 0) {
            await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [oAmt, targetEmployeeId]);
          }
        }
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

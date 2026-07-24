const express = require('express');
const router = express.Router();
const axios = require('axios'); // Added axios for proxy requests
const pool = require('../db');
const bcrypt = require('bcrypt');

// POST / (Mounted at /sales-order)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      ipNo, mobileNo, patientName, patientAddress, patientEmail, counterSale,
      ordDate, ordTime, userId, actCode, actName, drCode, drName, drAddress,
      drRegNo, drOfficeCode, dmanCode, orderTotal, orderDiscPer, refNo,
      orderId, remark, urgentFlag, ordConversionFlag, dcConversionFlag,
      ordRefNo, sysName, sysIp, sysUser, materialInfo
    } = req.body;

    await client.query('BEGIN');

    // 0. Auto-create patient if not exists
    if (mobileNo) {
      const checkRes = await client.query('SELECT id FROM patients WHERE mobile = $1', [mobileNo]);
      if (checkRes.rowCount === 0) {
        const hashedPassword = await bcrypt.hash(mobileNo, 10);
        await client.query(
          `INSERT INTO patients (name, mobile, email, password)
           VALUES ($1, $2, $3, $4)`,
          [patientName || 'Walk-in Patient', mobileNo, patientEmail || null, hashedPassword]
        );
      }
    }

    // 1. Insert Sales Order Header
    const insertHeader = `
      INSERT INTO ecogreen_sales_orders (
        ip_no, mobile_no, patient_name, patient_address, patient_email, counter_sale,
        ord_date, ord_time, user_id, act_code, act_name, dr_code, dr_name, dr_address,
        dr_reg_no, dr_office_code, dman_code, order_total, order_disc_per, ref_no,
        order_id, remark, urgent_flag, ord_conversion_flag, dc_conversion_flag,
        ord_ref_no, sys_name, sys_ip, sys_user
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING id;
    `;
    const headerValues = [
      ipNo, mobileNo, patientName, patientAddress, patientEmail, counterSale,
      ordDate, ordTime, userId, actCode, actName, drCode, drName, drAddress,
      drRegNo, drOfficeCode, dmanCode, orderTotal, orderDiscPer, refNo,
      orderId, remark, urgentFlag, ordConversionFlag, dcConversionFlag,
      ordRefNo, sysName, sysIp, sysUser
    ];

    const resHeader = await client.query(insertHeader, headerValues);
    const savedOrderId = resHeader.rows[0].id;

    // 2. Insert Items
    if (materialInfo && Array.isArray(materialInfo)) {
      for (const item of materialInfo) {
        const insertItem = `
          INSERT INTO ecogreen_sales_order_items (
            sales_order_id, item_seq, itemcode, item_name, total_loose_qty, total_loose_sch_qty,
            service_qty, sale_rate, disc_per, sch_disc_per
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        const itemValues = [
          savedOrderId,
          item.itemSeq,
          item.itemcode,
          item.itemName,
          item.totalLooseQty,
          item.totalLooseSchQty,
          item.serviceQty,
          item.saleRate,
          item.discPer,
          item.schDiscPer
        ];
        await client.query(insertItem, itemValues);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Sales order saved', orderId: savedOrderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving sales order:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET / (Mounted at /sales-orders-list)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ecogreen_sales_orders ORDER BY id DESC');
    
    // Transform keys to camelCase to match frontend expectations
    const orders = result.rows.map(r => ({
      id: r.id,
      ipNo: r.ip_no,
      mobileNo: r.mobile_no,
      patientName: r.patient_name,
      patientAddress: r.patient_address,
      patientEmail: r.patient_email,
      counterSale: r.counter_sale,
      ordDate: r.ord_date,
      ordTime: r.ord_time,
      userId: r.user_id,
      actCode: r.act_code,
      actName: r.act_name,
      drCode: r.dr_code,
      drName: r.dr_name,
      drAddress: r.dr_address,
      drRegNo: r.dr_reg_no,
      drOfficeCode: r.dr_office_code,
      dmanCode: r.dman_code,
      orderTotal: r.order_total,
      orderDiscPer: r.order_disc_per,
      refNo: r.ref_no,
      orderId: r.order_id,
      remark: r.remark,
      urgentFlag: r.urgent_flag,
      ordConversionFlag: r.ord_conversion_flag,
      dcConversionFlag: r.dc_conversion_flag,
      ordRefNo: r.ord_ref_no,
      sysName: r.sys_name,
      sysIp: r.sys_ip,
      sysUser: r.sys_user,
      deliveryBoyId: r.delivery_boy_id,
      deliveryType: r.delivery_type,
      busDetails: r.bus_details,
      createdAt: r.created_at
    }));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Error fetching sales orders:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /:id/assign-delivery
router.put('/:id/assign-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_boy_id, delivery_type, bus_details, delivery_assigned_user_type = 'employee', assigned_by } = req.body;
    
    // Generate 4-digit OTP
    const delivery_otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    let boyId = delivery_boy_id;
    let userType = delivery_assigned_user_type;
    if (typeof boyId === 'string' && boyId.startsWith('SA-')) {
      boyId = boyId.replace('SA-', '');
      userType = 'sub_admin';
    }
    const boyIdInt = boyId ? parseInt(boyId, 10) : null;

    const result = await pool.query(
      `UPDATE ecogreen_sales_orders 
       SET delivery_boy_id = $1, 
           delivery_type = $2, 
           bus_details = $3, 
           delivery_otp = $4,
           delivery_assigned_user_type = $5,
           assigned_by = COALESCE($6::integer, assigned_by)
       WHERE id = $7 
       RETURNING *`,
      [boyIdInt, delivery_type || 'Local', bus_details ? JSON.stringify(bus_details) : null, delivery_otp, userType, assigned_by || null, id]
    );

    // Also update ecogreensales_orders to keep in sync
    await pool.query(
      `UPDATE ecogreensales_orders 
       SET delivery_boy_id = $1, 
           delivery_type = $2, 
           bus_details = $3, 
           delivery_otp = $4,
           delivery_assigned_user_type = $5,
           assigned_by = COALESCE($6::integer, assigned_by)
       WHERE id = $7`,
      [boyIdInt, delivery_type || 'Local', bus_details ? JSON.stringify(bus_details) : null, delivery_otp, userType, assigned_by || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updatedOrder = result.rows[0];
    if (boyIdInt) {
      try {
        const tokenQuery = userType === 'sub_admin'
          ? 'SELECT push_token FROM department_admins WHERE id = $1'
          : 'SELECT push_token FROM employees WHERE id = $1';
        const empRes = await pool.query(tokenQuery, [boyIdInt]);
        if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
          const { sendExpoPushNotification } = require('../utils/pushNotification');
          let title = 'New Sales Order Assigned';
          let body = `Sales Order #${updatedOrder.id} has been assigned to you.`;
          
          const isStore = updatedOrder.delivery_type === 'Store' || updatedOrder.delivery_type === 'Counter';
          const isBus = updatedOrder.delivery_type === 'Bus';
          if (isStore) {
            title = 'New Store/Counter Order Assigned';
            body = `Sales Order #${updatedOrder.order_no || updatedOrder.id} has been assigned for Store/Counter delivery.`;
          } else if (isBus) {
            title = 'New Bus Delivery Assigned';
            const bDate = updatedOrder.bus_date ? (typeof updatedOrder.bus_date === 'string' ? updatedOrder.bus_date.split('T')[0] : updatedOrder.bus_date.toISOString().split('T')[0]) : '';
            body = `Bus order #${updatedOrder.id} has been assigned. Bus Date: ${bDate}`;
          }
          
          sendExpoPushNotification(empRes.rows[0].push_token, title, body);
        }
      } catch (e) {
        console.error('Push notification error:', e.message);
      }
    }

    res.json({ success: true, message: 'Delivery assigned successfully', delivery_otp });
  } catch (err) {
    console.error('Error assigning delivery:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /:id (Mounted at /sales-order/:id or /sales-orders-list/:id)
router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderResult = await pool.query('SELECT * FROM ecogreen_sales_orders WHERE id = $1', [orderId]);
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const itemsResult = await pool.query('SELECT * FROM ecogreen_sales_order_items WHERE sales_order_id = $1 ORDER BY item_seq', [orderId]);

    const order = orderResult.rows[0];
    const transformedOrder = {
      id: order.id,
      ipNo: order.ip_no,
      mobileNo: order.mobile_no,
      patientName: order.patient_name,
      patientAddress: order.patient_address,
      patientEmail: order.patient_email,
      counterSale: order.counter_sale,
      ordDate: order.ord_date,
      ordTime: order.ord_time,
      userId: order.user_id,
      actCode: order.act_code,
      actName: order.act_name,
      drCode: order.dr_code,
      drName: order.dr_name,
      drAddress: order.dr_address,
      drRegNo: order.dr_reg_no,
      drOfficeCode: order.dr_office_code,
      dmanCode: order.dman_code,
      orderTotal: order.order_total,
      orderDiscPer: order.order_disc_per,
      refNo: order.ref_no,
      orderId: order.order_id,
      remark: order.remark,
      urgentFlag: order.urgent_flag,
      ordConversionFlag: order.ord_conversion_flag,
      dcConversionFlag: order.dc_conversion_flag,
      ordRefNo: order.ord_ref_no,
      sysName: order.sys_name,
      sysIp: order.sys_ip,
      sysUser: order.sys_user,
      createdAt: order.created_at,
      materialInfo: itemsResult.rows.map(item => ({
        id: item.id,
        itemSeq: item.item_seq,
        itemcode: item.itemcode,
        itemName: item.item_name,
        totalLooseQty: item.total_loose_qty,
        totalLooseSchQty: item.total_loose_sch_qty,
        serviceQty: item.service_qty,
        saleRate: item.sale_rate,
        discPer: item.disc_per,
        schDiscPer: item.sch_disc_per
      }))
    };

    res.json({ success: true, data: transformedOrder });
  } catch (err) {
    console.error('Error fetching sales order details:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /:id/generate-invoice (Convert Order to Invoice)
router.post('/:id/generate-invoice', async (req, res) => {
  const client = await pool.connect();
  try {
    const orderId = req.params.id;
    
    // Fetch the original order
    const orderResult = await client.query('SELECT * FROM ecogreen_sales_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = orderResult.rows[0];

    // Fetch the original items
    const itemsResult = await client.query('SELECT * FROM ecogreen_sales_order_items WHERE sales_order_id = $1', [orderId]);
    const items = itemsResult.rows;

    await client.query('BEGIN');

    // Insert into ecogreen_sales_invoices
    const insertHeader = `
      INSERT INTO ecogreen_sales_invoices (
        sales_order_id, ip_no, mobile_no, patient_name, patient_address, patient_email, counter_sale,
        ord_date, ord_time, user_id, act_code, act_name, dr_code, dr_name, dr_address,
        dr_reg_no, dr_office_code, dman_code, order_total, order_disc_per, ref_no,
        order_id, remark, urgent_flag, ord_conversion_flag, dc_conversion_flag,
        ord_ref_no, sys_name, sys_ip, sys_user
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING id;
    `;
    const headerValues = [
      order.id, order.ip_no, order.mobile_no, order.patient_name, order.patient_address, order.patient_email, order.counter_sale,
      order.ord_date, order.ord_time, order.user_id, order.act_code, order.act_name, order.dr_code, order.dr_name, order.dr_address,
      order.dr_reg_no, order.dr_office_code, order.dman_code, order.order_total, order.order_disc_per, order.ref_no,
      order.order_id, order.remark, order.urgent_flag, order.ord_conversion_flag, order.dc_conversion_flag,
      order.ord_ref_no, order.sys_name, order.sys_ip, order.sys_user
    ];
    
    const resHeader = await client.query(insertHeader, headerValues);
    const savedInvoiceId = resHeader.rows[0].id;

    // Insert into ecogreen_sales_invoice_items
    for (const item of items) {
      const insertItem = `
        INSERT INTO ecogreen_sales_invoice_items (
          sales_invoice_id, item_seq, itemcode, item_name, total_loose_qty, total_loose_sch_qty,
          service_qty, sale_rate, disc_per, sch_disc_per
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      const itemValues = [
        savedInvoiceId, item.item_seq, item.itemcode, item.item_name, item.total_loose_qty, item.total_loose_sch_qty,
        item.service_qty, item.sale_rate, item.disc_per, item.sch_disc_per
      ];
      await client.query(insertItem, itemValues);
    }

    // Mark the original order as converted (optional: update dc_conversion_flag or similar)
    await client.query('UPDATE ecogreen_sales_orders SET ord_conversion_flag = 1 WHERE id = $1', [orderId]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Sales Invoice Generated', invoiceId: savedInvoiceId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice from order:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

// Proxy route for token generation to avoid CORS
router.post('/generate-token', async (req, res) => {
  try {
    const response = await fetch('http://117.211.64.158:21000/ws_c2_services_generate_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Token proxy error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy route for stock data to avoid CORS
router.post('/get-stock-data', async (req, res) => {
  try {
    const response = await fetch('http://117.211.64.158:21000/ws_c2_services_get_stock_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Stock data proxy error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id/update-bus-details
router.put('/:id/update-bus-details', async (req, res) => {
  try {
    const { id } = req.params;
    const { bus_details } = req.body;
    
    let targetTable = 'ecogreen_sales_orders';
    let checkRes = await pool.query('SELECT id FROM ecogreen_sales_orders WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      checkRes = await pool.query('SELECT id FROM ecogreensales_orders WHERE id = $1', [id]);
      if (checkRes.rowCount > 0) {
        targetTable = 'ecogreensales_orders';
      }
    }

    const result = await pool.query(
      `UPDATE ${targetTable} SET bus_details = $1 WHERE id = $2 RETURNING *`,
      [bus_details ? (typeof bus_details === 'string' ? bus_details : JSON.stringify(bus_details)) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Bus details updated successfully' });
  } catch (err) {
    console.error('Error updating bus details:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, delivery_otp, pod_payment_mode, payment_txn_id, cash_amount, online_amount, credit_amount } = req.body;
    
    let targetTable = 'ecogreen_sales_orders';
    let checkRes = await pool.query('SELECT delivery_otp FROM ecogreen_sales_orders WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      checkRes = await pool.query('SELECT delivery_otp FROM ecogreensales_orders WHERE id = $1', [id]);
      if (checkRes.rowCount > 0) {
        targetTable = 'ecogreensales_orders';
      }
    }

    if (status === 'DELIVERED' || status === 'Delivered' || status === 'CANCELLED' || status === 'Cancelled') {
      if (checkRes.rowCount > 0 && checkRes.rows[0].delivery_otp) {
          if (checkRes.rows[0].delivery_otp !== delivery_otp) {
               return res.status(400).json({ success: false, message: 'Invalid OTP' });
          }
      }
    }
    
    const result = await pool.query(
      `UPDATE ${targetTable} 
       SET status = $1,
           pod_payment_mode = COALESCE($2, pod_payment_mode),
           payment_txn_id = COALESCE($3, payment_txn_id),
           cash_amount = COALESCE($5, cash_amount),
           online_amount = COALESCE($6, online_amount),
           credit_amount = COALESCE($7, credit_amount),
           delivered_at = CASE WHEN $1 = 'DELIVERED' OR $1 = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
       WHERE id = $4 
       RETURNING *`,
      [
        status, 
        pod_payment_mode || null, 
        payment_txn_id || null, 
        id,
        cash_amount !== undefined ? parseFloat(cash_amount) : null,
        online_amount !== undefined ? parseFloat(online_amount) : null,
        credit_amount !== undefined ? parseFloat(credit_amount) : null
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updatedOrder = result.rows[0];
    const isPOD = updatedOrder.payment_mode === 'POD' || 
                  updatedOrder.payment_mode === 'COD' || 
                  updatedOrder.payment_mode === 'Cash' || 
                  updatedOrder.payment_mode === 'Online' || 
                  updatedOrder.payment_mode === 'Split';

    if ((updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'Delivered') && isPOD && updatedOrder.delivery_boy_id) {
      let targetEmployeeId = updatedOrder.delivery_boy_id.toString();
      if (updatedOrder.delivery_assigned_user_type === 'sub_admin') {
        targetEmployeeId = 'SA-' + targetEmployeeId;
      }
      
      let cAmt = parseFloat(updatedOrder.cash_amount || 0);
      let oAmt = parseFloat(updatedOrder.online_amount || 0);
      const crAmt = parseFloat(updatedOrder.credit_amount || 0);

      // Fallback for old system / unspecified split amounts
      if (cAmt === 0 && oAmt === 0) {
        const mode = updatedOrder.pod_payment_mode || updatedOrder.payment_mode || 'Cash';
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

      // Create or update employee wallet first
      const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [targetEmployeeId]);
      if (wCheck.rowCount === 0) {
        await pool.query(
          'INSERT INTO employee_wallets (employee_id, cash_in_hand, online_collected, balance) VALUES ($1, 0, 0, 0)',
          [targetEmployeeId]
        );
      }

      if (cAmt > 0 || oAmt > 0) {
        const txType = pod_payment_mode === 'Split' ? 'split_collection' : (pod_payment_mode === 'Online' ? 'online_collection' : 'cash_collection');
        const txMode = pod_payment_mode || 'Cash';
        const totalPaid = cAmt + oAmt;

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
            `Sales Order ${updatedOrder.order_no || updatedOrder.id} Delivered (${txMode})`, 
            'completed', 
            txMode,
            payment_txn_id || null,
            updatedOrder.order_no || updatedOrder.id,
            '',
            updatedOrder.patient_name || '',
            updatedOrder.patient_contact_no || '',
            updatedOrder.delivery_type || '',
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

    res.json({ success: true, message: 'Order status updated successfully', data: updatedOrder });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update details (address, notes, modified_by metadata, payment fields)
router.put('/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      address, new_note, note_author, 
      modified_by_id, modified_by_type, modified_by_name,
      payment_mode, pod_payment_mode, payment_txn_id, 
      cash_amount, online_amount, credit_amount, paid_amount, 
      status
    } = req.body;

    let targetTable = 'ecogreen_sales_orders';
    let currentRes = await pool.query('SELECT notes, status, payment_mode, delivery_boy_id, delivery_assigned_user_type, total_price FROM ecogreen_sales_orders WHERE id = $1', [id]);
    if (currentRes.rowCount === 0) {
      currentRes = await pool.query('SELECT notes, status, payment_mode, delivery_boy_id, delivery_assigned_user_type, total_price FROM ecogreensales_orders WHERE id = $1', [id]);
      if (currentRes.rowCount > 0) {
        targetTable = 'ecogreensales_orders';
      } else {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
    }

    const wasDelivered = currentRes.rows[0].status === 'DELIVERED' || currentRes.rows[0].status === 'Delivered';

    let updatedNotes = currentRes.rows[0].notes || '[]';
    if (new_note) {
      let notesArr = [];
      try {
        notesArr = typeof updatedNotes === 'string' ? JSON.parse(updatedNotes) : updatedNotes;
        if (!Array.isArray(notesArr)) notesArr = [];
      } catch (e) {
        notesArr = [];
      }
      notesArr.push({
        text: new_note,
        author: note_author || 'System',
        timestamp: new Date().toISOString()
      });
      updatedNotes = notesArr;
    }

    const queryText = `
      UPDATE ${targetTable} 
      SET patient_address = COALESCE($1, patient_address),
          notes = $2,
          modified_by_id = $3,
          modified_by_type = $4,
          modified_by_name = $5,
          payment_mode = COALESCE($7, payment_mode),
          pod_payment_mode = COALESCE($8, pod_payment_mode),
          payment_txn_id = COALESCE($9, payment_txn_id),
          cash_amount = COALESCE($10, cash_amount),
          online_amount = COALESCE($11, online_amount),
          credit_amount = COALESCE($12, credit_amount),
          paid_amount = COALESCE($13, paid_amount),
          status = COALESCE($14, status),
          delivered_at = CASE WHEN COALESCE($14, status) = 'DELIVERED' OR COALESCE($14, status) = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
          payment_re_edited_by = CASE WHEN $15 = TRUE THEN COALESCE($5, payment_re_edited_by) ELSE payment_re_edited_by END
      WHERE id = $6
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      address || null, 
      JSON.stringify(updatedNotes), 
      modified_by_id || null, 
      modified_by_type || null, 
      modified_by_name || null, 
      id,
      payment_mode || null,
      pod_payment_mode || null,
      payment_txn_id || null,
      cash_amount !== undefined ? parseFloat(cash_amount) : null,
      online_amount !== undefined ? parseFloat(online_amount) : null,
      credit_amount !== undefined ? parseFloat(credit_amount) : null,
      paid_amount !== undefined ? parseFloat(paid_amount) : null,
      status || null,
      wasDelivered
    ]);

    const updatedOrder = rows[0];

    // Wallet update logic for POD orders when transitioning to Delivered (only if NOT previously delivered)
    const isPOD = updatedOrder.payment_mode === 'POD' || 
                  updatedOrder.payment_mode === 'COD' || 
                  updatedOrder.payment_mode === 'Cash' || 
                  updatedOrder.payment_mode === 'Online' || 
                  updatedOrder.payment_mode === 'Split';

    const isDelivered = updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'Delivered';

    if (isDelivered && !wasDelivered && isPOD) {
      let updaterId = modified_by_id || updatedOrder.delivery_boy_id;
      if (updaterId) {
        let targetEmployeeId = updaterId.toString();
        if (modified_by_type === 'Admin' || modified_by_type === 'Sub Admin' || updatedOrder.delivery_assigned_user_type === 'sub_admin') {
          if (!targetEmployeeId.startsWith('SA-')) {
            targetEmployeeId = 'SA-' + targetEmployeeId;
          }
        }

        // Duplicate wallet transaction check
        const txCheck = await pool.query(
          'SELECT id FROM wallet_transactions WHERE order_no = $1 OR (invoice_no = $2 AND invoice_no <> \'\')',
          [(updatedOrder.order_no || updatedOrder.id || '').toString(), (updatedOrder.invoice_id || '').toString()]
        );

        if (txCheck.rowCount === 0) {
          let cAmt = parseFloat(updatedOrder.cash_amount || 0);
          let oAmt = parseFloat(updatedOrder.online_amount || 0);
          const crAmt = parseFloat(updatedOrder.credit_amount || 0);

          if (cAmt === 0 && oAmt === 0) {
            const mode = updatedOrder.pod_payment_mode || updatedOrder.payment_mode || 'Cash';
            const totalPaid = parseFloat(updatedOrder.paid_amount || updatedOrder.total_price || 0);
            if (mode === 'Online') {
              oAmt = totalPaid;
            } else if (mode === 'Split') {
              cAmt = Math.floor(totalPaid / 2);
              oAmt = totalPaid - cAmt;
            } else {
              cAmt = totalPaid;
            }
          }

          const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [targetEmployeeId]);
          if (wCheck.rowCount === 0) {
            await pool.query(
              'INSERT INTO employee_wallets (employee_id, cash_in_hand, online_collected, balance) VALUES ($1, 0, 0, 0)',
              [targetEmployeeId]
            );
          }

          if (cAmt > 0 || oAmt > 0) {
            const txType = (updatedOrder.pod_payment_mode === 'Split') ? 'split_collection' : ((updatedOrder.pod_payment_mode === 'Online') ? 'online_collection' : 'cash_collection');
            const txMode = updatedOrder.pod_payment_mode || 'Cash';
            const totalPaid = cAmt + oAmt;

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
                updatedOrder.payment_txn_id || null,
                updatedOrder.order_no || updatedOrder.id,
                updatedOrder.invoice_id || '',
                updatedOrder.patient_name || '',
                updatedOrder.patient_contact_no || '',
                updatedOrder.delivery_type || '',
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
    }

    res.json({ success: true, message: 'Order details updated', order: updatedOrder });
  } catch (err) {
    console.error("Update sales order details error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

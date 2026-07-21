const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// POST / (Mounted at /sales-invoice)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      salesOrderId, // Optional
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

    // 1. Insert Sales Invoice Header
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
      salesOrderId || null,
      ipNo, mobileNo, patientName, patientAddress, patientEmail, counterSale,
      ordDate, ordTime, userId, actCode, actName, drCode, drName, drAddress,
      drRegNo, drOfficeCode, dmanCode, orderTotal, orderDiscPer, refNo,
      orderId, remark, urgentFlag, ordConversionFlag, dcConversionFlag,
      ordRefNo, sysName, sysIp, sysUser
    ];

    const resHeader = await client.query(insertHeader, headerValues);
    const savedInvoiceId = resHeader.rows[0].id;

    // 2. Insert Items
    if (materialInfo && Array.isArray(materialInfo)) {
      for (const item of materialInfo) {
        const insertItem = `
          INSERT INTO ecogreen_sales_invoice_items (
            sales_invoice_id, item_seq, itemcode, item_name, total_loose_qty, total_loose_sch_qty,
            service_qty, sale_rate, disc_per, sch_disc_per
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        const itemValues = [
          savedInvoiceId,
          item.itemSeq || item.item_seq,
          item.itemcode,
          item.itemName || item.item_name,
          item.totalLooseQty || item.total_loose_qty,
          item.totalLooseSchQty || item.total_loose_sch_qty || 0,
          item.serviceQty || item.service_qty || 0,
          item.saleRate || item.sale_rate,
          item.discPer || item.disc_per || "0.00",
          item.schDiscPer || item.sch_disc_per || "0.00"
        ];
        await client.query(insertItem, itemValues);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Sales invoice saved', invoiceId: savedInvoiceId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving sales invoice:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET / (Mounted at /sales-invoice-list)
router.get('/', async (req, res) => {
  try {
    let sqlQuery = 'SELECT * FROM ecogreen_sales_invoices ORDER BY id DESC';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    if (limit && !isNaN(limit)) {
      sqlQuery += ` LIMIT ${limit}`;
    }
    const result = await pool.query(sqlQuery);
    
    // Transform keys to camelCase to match frontend expectations
    const invoices = result.rows.map(r => ({
      id: r.id,
      salesOrderId: r.sales_order_id,
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

    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('Error fetching sales invoices:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /:id (Mounted at /sales-invoice/:id or /sales-invoice-list/:id)
router.get('/:id', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const invoiceResult = await pool.query('SELECT * FROM ecogreen_sales_invoices WHERE id = $1', [invoiceId]);
    
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const itemsResult = await pool.query('SELECT * FROM ecogreen_sales_invoice_items WHERE sales_invoice_id = $1 ORDER BY item_seq', [invoiceId]);

    const invoice = invoiceResult.rows[0];
    const transformedInvoice = {
      id: invoice.id,
      salesOrderId: invoice.sales_order_id,
      ipNo: invoice.ip_no,
      mobileNo: invoice.mobile_no,
      patientName: invoice.patient_name,
      patientAddress: invoice.patient_address,
      patientEmail: invoice.patient_email,
      counterSale: invoice.counter_sale,
      ordDate: invoice.ord_date,
      ordTime: invoice.ord_time,
      userId: invoice.user_id,
      actCode: invoice.act_code,
      actName: invoice.act_name,
      drCode: invoice.dr_code,
      drName: invoice.dr_name,
      drAddress: invoice.dr_address,
      drRegNo: invoice.dr_reg_no,
      drOfficeCode: invoice.dr_office_code,
      dmanCode: invoice.dman_code,
      orderTotal: invoice.order_total,
      orderDiscPer: invoice.order_disc_per,
      refNo: invoice.ref_no,
      orderId: invoice.order_id,
      remark: invoice.remark,
      urgentFlag: invoice.urgent_flag,
      ordConversionFlag: invoice.ord_conversion_flag,
      dcConversionFlag: invoice.dc_conversion_flag,
      ordRefNo: invoice.ord_ref_no,
      sysName: invoice.sys_name,
      sysIp: invoice.sys_ip,
      sysUser: invoice.sys_user,
      deliveryBoyId: invoice.delivery_boy_id,
      deliveryType: invoice.delivery_type,
      busDetails: invoice.bus_details,
      createdAt: invoice.created_at,
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

    res.json({ success: true, data: transformedInvoice });
  } catch (err) {
    console.error('Error fetching sales invoice:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/:id/assign-delivery', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_boy_id, delivery_type, bus_details, delivery_assigned_user_type = 'employee' } = req.body;
    
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
      `UPDATE ecogreen_sales_invoices 
       SET delivery_boy_id = $1, 
           delivery_type = $2, 
           bus_details = $3,
           delivery_otp = $4,
           delivery_assigned_user_type = $5
       WHERE id = $6 
       RETURNING *`,
      [boyIdInt, delivery_type || 'Local', bus_details ? JSON.stringify(bus_details) : null, delivery_otp, userType, id]
    );

    // Also update ecogreensales_invoices keeping in sync (column is delivered_by_id)
    await pool.query(
      `UPDATE ecogreensales_invoices 
       SET delivered_by_id = $1, 
           delivery_type = $2, 
           bus_details = $3,
           delivery_otp = $4,
           delivery_assigned_user_type = $5
       WHERE id = $6`,
      [boyIdInt, delivery_type || 'Local', bus_details ? JSON.stringify(bus_details) : null, delivery_otp, userType, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const updatedInvoice = result.rows[0];
    if (boyIdInt) {
      try {
        const tokenQuery = userType === 'sub_admin'
          ? 'SELECT push_token FROM department_admins WHERE id = $1'
          : 'SELECT push_token FROM employees WHERE id = $1';
        const empRes = await pool.query(tokenQuery, [boyIdInt]);
        if (empRes.rowCount > 0 && empRes.rows[0].push_token) {
          const { sendExpoPushNotification } = require('../utils/pushNotification');
          let title = 'New Sales Invoice Assigned';
          let body = `Sales Invoice #${updatedInvoice.id} has been assigned to you.`;
          
          const isStore = updatedInvoice.delivery_type === 'Store' || updatedInvoice.delivery_type === 'Counter';
          const isBus = updatedInvoice.delivery_type === 'Bus';
          if (isStore) {
            title = 'New Store/Counter Order Assigned';
            body = `Sales Invoice #${updatedInvoice.invoice_id || updatedInvoice.id} has been assigned for Store/Counter delivery.`;
          } else if (isBus) {
            title = 'New Bus Delivery Assigned';
            const bDate = updatedInvoice.bus_date ? (typeof updatedInvoice.bus_date === 'string' ? updatedInvoice.bus_date.split('T')[0] : updatedInvoice.bus_date.toISOString().split('T')[0]) : '';
            body = `Bus invoice #${updatedInvoice.id} has been assigned. Bus Date: ${bDate}`;
          }
          
          sendExpoPushNotification(empRes.rows[0].push_token, title, body);
        }
      } catch (e) {
        console.error('Push notification error:', e.message);
      }
    }

    res.json({ success: true, message: 'Delivery assigned successfully' });
  } catch (err) {
    console.error('Error assigning delivery:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /:id/update-bus-details
router.put('/:id/update-bus-details', async (req, res) => {
  try {
    const { id } = req.params;
    const { bus_details } = req.body;
    
    const result = await pool.query(
      'UPDATE ecogreen_sales_invoices SET bus_details = $1 WHERE id = $2 RETURNING *',
      [bus_details ? JSON.stringify(bus_details) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
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
    const { status, delivery_otp, pod_payment_mode, payment_txn_id } = req.body;
    
    const checkRes = await pool.query('SELECT delivery_otp FROM ecogreen_sales_invoices WHERE id = $1', [id]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    if (status === 'DELIVERED' || status === 'Delivered') {
      if (checkRes.rows[0].delivery_otp && checkRes.rows[0].delivery_otp !== delivery_otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }
    }
    
    const result = await pool.query(
      `UPDATE ecogreen_sales_invoices 
       SET status = $1,
           pod_payment_mode = COALESCE($2, pod_payment_mode),
           payment_txn_id = COALESCE($3, payment_txn_id),
           delivered_at = CASE WHEN $1 = 'DELIVERED' OR $1 = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
       WHERE id = $4 
       RETURNING *`,
      [status, pod_payment_mode || null, payment_txn_id || null, id]
    );

    // Also update ecogreensales_invoices keeping in sync
    await pool.query(
      `UPDATE ecogreensales_invoices 
       SET status = $1,
           pod_payment_mode = COALESCE($2, pod_payment_mode),
           payment_txn_id = COALESCE($3, payment_txn_id),
           delivered_at = CASE WHEN $1 = 'DELIVERED' OR $1 = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
       WHERE id = $4`,
      [status, pod_payment_mode || null, payment_txn_id || null, id]
    );

    const updatedOrder = result.rows[0];
    if ((updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'Delivered') && updatedOrder.payment_mode === 'POD' && updatedOrder.delivered_by_id) {
      let targetEmployeeId = updatedOrder.delivered_by_id.toString();
      if (updatedOrder.delivery_assigned_user_type === 'sub_admin') {
        targetEmployeeId = 'SA-' + targetEmployeeId;
      }
      
      const amt = parseFloat(updatedOrder.total_amount || updatedOrder.total_price || 0);
      const isCash = pod_payment_mode === 'Cash';

      await pool.query(
        `INSERT INTO wallet_transactions (
          employee_id, type, amount, note, status, payment_mode, payment_txn_id,
          order_no, invoice_no, customer_name, customer_phone, delivery_method, 
          cash_amount, online_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING`, 
        [
          targetEmployeeId, 
          isCash ? 'cash_collection' : 'online_collection', 
          amt, 
          `Invoice ${updatedOrder.invoice_no || updatedOrder.id} Delivered (POD ${isCash ? 'Cash' : 'Online'})`, 
          'completed', 
          isCash ? 'Cash' : 'Online',
          isCash ? null : (payment_txn_id || null),
          '',
          updatedOrder.invoice_no || updatedOrder.id,
          updatedOrder.patient_name || '',
          updatedOrder.patient_contact_no || '',
          updatedOrder.delivery_type || '',
          isCash ? amt : 0,
          isCash ? 0 : amt
        ]
      );

      const wCheck = await pool.query('SELECT id FROM employee_wallets WHERE employee_id = $1', [targetEmployeeId]);
      if (wCheck.rowCount === 0) {
        await pool.query(
          'INSERT INTO employee_wallets (employee_id, cash_in_hand, online_collected, balance) VALUES ($1, $2, $3, 0)',
          [targetEmployeeId, isCash ? amt : 0, isCash ? 0 : amt]
        );
      } else {
        if (isCash) {
          await pool.query('UPDATE employee_wallets SET cash_in_hand = cash_in_hand + $1 WHERE employee_id = $2', [amt, targetEmployeeId]);
        } else {
          await pool.query('UPDATE employee_wallets SET online_collected = online_collected + $1 WHERE employee_id = $2', [amt, targetEmployeeId]);
        }
      }
    }

    res.json({ success: true, message: 'Invoice status updated successfully', data: updatedOrder });
  } catch (err) {
    console.error('Error updating sales invoice status:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;

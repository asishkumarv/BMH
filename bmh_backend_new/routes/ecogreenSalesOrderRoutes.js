const express = require('express');
const router = express.Router();
const axios = require('axios'); // Added axios for proxy requests
const pool = require('../db');

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
      createdAt: r.created_at
    }));

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Error fetching sales orders:', err);
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

module.exports = router;

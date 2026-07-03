const express = require('express');
const router = express.Router();
const pool = require('../db');

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
    const result = await pool.query('SELECT * FROM ecogreen_sales_invoices ORDER BY id DESC');
    
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
      createdAt: r.created_at
    }));

    res.json({ success: true, data: invoices });
  } catch (err) {
    console.error('Error fetching sales invoices:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;

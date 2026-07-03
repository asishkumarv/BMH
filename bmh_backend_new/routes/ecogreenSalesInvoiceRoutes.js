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
    console.error('Error fetching sales invoice details:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;

require('dotenv').config();
const pool = require('./db');

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Creating EcoGreen Sales Invoices tables...');

    // 1. ecogreen_sales_invoices Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ecogreen_sales_invoices (
        id SERIAL PRIMARY KEY,
        sales_order_id INTEGER, -- Optional link back to the sales order
        ip_no VARCHAR(255),
        mobile_no VARCHAR(255),
        patient_name VARCHAR(255),
        patient_address TEXT,
        patient_email VARCHAR(255),
        counter_sale VARCHAR(50),
        ord_date DATE,
        ord_time TIME,
        user_id VARCHAR(255),
        act_code VARCHAR(255),
        act_name VARCHAR(255),
        dr_code VARCHAR(255),
        dr_name VARCHAR(255),
        dr_address TEXT,
        dr_reg_no VARCHAR(255),
        dr_office_code VARCHAR(255),
        dman_code VARCHAR(255),
        order_total NUMERIC(10,2),
        order_disc_per NUMERIC(5,2),
        ref_no INTEGER,
        order_id INTEGER,
        remark TEXT,
        urgent_flag INTEGER,
        ord_conversion_flag INTEGER,
        dc_conversion_flag INTEGER,
        ord_ref_no INTEGER,
        sys_name VARCHAR(255),
        sys_ip VARCHAR(255),
        sys_user VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. ecogreen_sales_invoice_items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ecogreen_sales_invoice_items (
        id SERIAL PRIMARY KEY,
        sales_invoice_id INTEGER REFERENCES ecogreen_sales_invoices(id) ON DELETE CASCADE,
        item_seq INTEGER,
        itemcode VARCHAR(255),
        item_name VARCHAR(255),
        total_loose_qty INTEGER,
        total_loose_sch_qty INTEGER,
        service_qty INTEGER,
        sale_rate NUMERIC(10,2),
        disc_per VARCHAR(50),
        sch_disc_per VARCHAR(50)
      );
    `);

    await client.query('COMMIT');
    console.log('Tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createTables();

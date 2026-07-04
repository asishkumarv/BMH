const pool = require('../db');

const addStatusColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add status to ecogreen_sales_orders
    await client.query(`
      ALTER TABLE ecogreen_sales_orders 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING'
    `);

    // Add status to ecogreen_sales_invoices
    await client.query(`
      ALTER TABLE ecogreen_sales_invoices 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING'
    `);

    await client.query('COMMIT');
    console.log("Successfully added status column to ecogreen_sales_orders and ecogreen_sales_invoices.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding status column:", error);
  } finally {
    client.release();
    pool.end();
  }
};

addStatusColumn();

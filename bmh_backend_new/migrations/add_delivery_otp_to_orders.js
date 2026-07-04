const pool = require('../db');

const addDeliveryOtpColumn = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add delivery_otp to online_orders
    await client.query(`
      ALTER TABLE online_orders 
      ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10)
    `);

    // Add delivery_otp to ecogreen_sales_orders
    await client.query(`
      ALTER TABLE ecogreen_sales_orders 
      ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10)
    `);

    await client.query('COMMIT');
    console.log("Successfully added delivery_otp column to online_orders and ecogreen_sales_orders.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error adding delivery_otp column:", error);
  } finally {
    client.release();
    pool.end();
  }
};

addDeliveryOtpColumn();

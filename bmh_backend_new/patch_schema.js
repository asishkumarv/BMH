const pool = require('./db');

async function patchDB() {
  try {
    const query1 = `
      ALTER TABLE ecogreen_sales_orders
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bus_details JSONB;
    `;
    await pool.query(query1);
    console.log('Added columns to ecogreen_sales_orders');

    const query2 = `
      ALTER TABLE ecogreen_sales_invoices
      ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bus_details JSONB;
    `;
    await pool.query(query2);
    console.log('Added columns to ecogreen_sales_invoices');
  } catch(e) {
    console.error('Error patching DB schema:', e);
  } finally {
    pool.end();
  }
}
patchDB();

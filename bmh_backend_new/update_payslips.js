const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bmh_db',
});

async function updatePayslipsTable() {
  try {
    await pool.query(`
      ALTER TABLE payslips ADD COLUMN IF NOT EXISTS details JSONB;
    `);
    console.log("Added 'details' column to payslips table successfully.");
  } catch (error) {
    console.error("Error updating payslips table:", error);
  } finally {
    pool.end();
  }
}

updatePayslipsTable();

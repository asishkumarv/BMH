require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Altering leave_requests...');
    try {
      await client.query('ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey');
    } catch(e) {}
    await client.query(`
      ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee';
    `);

    console.log('Altering employee_leave_settings...');
    try {
      await client.query('ALTER TABLE employee_leave_settings DROP CONSTRAINT IF EXISTS employee_leave_settings_employee_id_fkey');
    } catch(e) {}
    await client.query(`
      ALTER TABLE employee_leave_settings ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee';
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();

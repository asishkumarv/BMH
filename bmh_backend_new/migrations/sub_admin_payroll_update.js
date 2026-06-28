require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Altering department_admins...');
    await client.query(`
      ALTER TABLE department_admins
      ADD COLUMN IF NOT EXISTS mobile VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS schedule_in VARCHAR(255),
      ADD COLUMN IF NOT EXISTS schedule_out VARCHAR(255),
      ADD COLUMN IF NOT EXISTS break_in VARCHAR(255),
      ADD COLUMN IF NOT EXISTS break_out VARCHAR(255),
      ADD COLUMN IF NOT EXISTS weekly_off_days VARCHAR(255);
    `);

    console.log('Altering attendance...');
    try {
      await client.query('ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey');
    } catch(e) { console.warn('Could not drop attendance FK', e.message); }
    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee';
    `);

    console.log('Altering break_logs...');
    try {
      await client.query('ALTER TABLE break_logs DROP CONSTRAINT IF EXISTS break_logs_employee_id_fkey');
    } catch(e) { console.warn('Could not drop break_logs FK', e.message); }
    await client.query(`
      ALTER TABLE break_logs ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee';
    `);

    console.log('Altering payslips...');
    try {
      await client.query('ALTER TABLE payslips DROP CONSTRAINT IF EXISTS payslips_employee_id_fkey');
    } catch(e) { console.warn('Could not drop payslips FK', e.message); }
    await client.query(`
      ALTER TABLE payslips 
      ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'employee',
      ADD COLUMN IF NOT EXISTS appreciation_amount NUMERIC(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS extra_working_amount NUMERIC(10,2) DEFAULT 0.00;
    `);

    console.log('Creating profile_update_requests...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_update_requests (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL,
        department_name VARCHAR(255),
        requested_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

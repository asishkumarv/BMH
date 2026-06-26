const pool = require('./db');
async function run() {
  try {
    await pool.query('BEGIN');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_leave_settings (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
        leaves_per_month INTEGER DEFAULT 0,
        extra_leave_penalty NUMERIC(10, 2) DEFAULT 0.00,
        late_checkin_limit INTEGER DEFAULT 0,
        late_checkin_penalty NUMERIC(10, 2) DEFAULT 0.00,
        early_checkout_limit INTEGER DEFAULT 0,
        early_checkout_penalty NUMERIC(10, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('COMMIT');
    console.log('Database migrated successfully.');
  } catch (e) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    process.exit(0);
  }
}
run();

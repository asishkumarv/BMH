const pool = require('./db');

async function checkSettings() {
  try {
    const res = await pool.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'employee_leave_settings'::regclass;");
    console.log(res.rows);
  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    process.exit(0);
  }
}

checkSettings();

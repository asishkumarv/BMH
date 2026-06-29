const pool = require('./db');

async function checkCol() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employee_leave_settings' AND column_name = 'employee_id';");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkCol();

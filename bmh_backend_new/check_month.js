const pool = require('./db');

async function checkMonth() {
  try {
    const res = await pool.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'payslips' AND column_name = 'month';");
    console.log(res.rows);
  } catch (err) {
    console.error('Error checking DB:', err);
  } finally {
    process.exit(0);
  }
}

checkMonth();

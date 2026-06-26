const pool = require('./db');

async function check() {
  const res = await pool.query("SELECT * FROM employees WHERE email = 'asishkumarv@gmail.com'");
  console.log(res.rows);
  process.exit(0);
}
check();

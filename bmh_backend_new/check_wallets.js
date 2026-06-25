const pool = require('./db');

async function run() {
  try {
    const res = await pool.query('SELECT * FROM employee_wallets');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();

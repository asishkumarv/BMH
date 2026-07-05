const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`SELECT NOW()`);
    console.log("DB Time:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();

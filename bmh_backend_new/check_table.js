const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/bmh',
});

async function check() {
  try {
    const res = await pool.query(`SELECT COUNT(*) FROM buses`);
    console.log("Buses count:", res.rows[0].count);
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
}
check();

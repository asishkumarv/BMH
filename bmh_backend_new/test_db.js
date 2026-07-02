const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/bmh' 
});

async function test() {
  try {
    const res = await pool.query("SELECT id, slot_id, status FROM patient_bookings LIMIT 10");
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

test();

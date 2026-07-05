require('dotenv').config();
const pool = require('./db.js');
async function test() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cancelled_patient_bookings'");
    console.log(res.rows);
  } catch (err) {
    console.log("ERROR:", err.message);
  } finally {
    pool.end();
  }
}
test();

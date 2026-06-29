require('dotenv').config();
const pool = require('./db');
pool.query(`SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'patient_bookings'`).then(res => {
  console.table(res.rows);
  process.exit(0);
});

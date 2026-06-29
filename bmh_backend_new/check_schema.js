const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/bmh' });
pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patient_bookings'`).then(res => {
  console.table(res.rows);
  process.exit(0);
});

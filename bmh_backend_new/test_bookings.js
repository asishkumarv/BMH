const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'bmh_db', password: 'root', port: 5432 });

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings';")
  .then(res => {
    console.log(res.rows.map(r => r.column_name));
    pool.end();
  })
  .catch(console.error);

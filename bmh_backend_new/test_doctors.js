const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT id, status FROM doctors LIMIT 5;")
  .then(res => {
    console.log(res.rows);
    pool.end();
  })
  .catch(console.error);

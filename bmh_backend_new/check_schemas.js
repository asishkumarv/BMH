require('dotenv').config();
const pool = require('./db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();

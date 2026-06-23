require('dotenv').config();
const pool = require('./db');

async function check() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const tasks = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'");
    console.log('Tasks columns:', tasks.rows.map(r => r.column_name));
    
    const att = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'");
    console.log('Attendance columns:', att.rows.map(r => r.column_name));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();

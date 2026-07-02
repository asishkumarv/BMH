const pool = require('./db');
async function run() {
  try {
    const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'department_admins'`);
    console.log('department_admins:', res.rows.map(r => r.column_name));
    
    const res2 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'doctors'`);
    console.log('doctors:', res2.rows.map(r => r.column_name));
  } finally {
    pool.end();
  }
}
run();

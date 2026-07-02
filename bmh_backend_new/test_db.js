const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'employees\'').then(res => {
  console.log(res.rows.map(r => r.column_name));
  return pool.query('SELECT * FROM employees LIMIT 1');
}).then(res => {
  console.log('Sample Row:', res.rows[0]);
}).catch(console.error).finally(() => pool.end());

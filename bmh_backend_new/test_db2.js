const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'department_admins\'').then(res => {
  console.log('department_admins columns:', res.rows.map(r => r.column_name));
}).catch(console.error).finally(() => pool.end());

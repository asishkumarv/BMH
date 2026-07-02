const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });
pool.query('SELECT id FROM super_admins').then(res => {
  console.log('Super Admins:', res.rows);
}).catch(console.error).finally(() => pool.end());

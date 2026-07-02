const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });
pool.query('SELECT employee_id FROM employee_wallets LIMIT 5').then(res => {
  console.log('wallets:', res.rows);
}).catch(console.error).finally(() => pool.end());

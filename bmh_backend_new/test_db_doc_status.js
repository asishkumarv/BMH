const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });
pool.query('SELECT status FROM doctors LIMIT 5').then(res => {
  console.log('doctors status:', res.rows);
}).catch(console.error).finally(() => pool.end());

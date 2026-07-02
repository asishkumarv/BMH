const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });

async function run() {
  const t1 = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'employee_wallets\'');
  console.log('employee_wallets:', t1.rows);
  
  const t2 = await pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'cash_handovers\'');
  console.log('cash_handovers:', t2.rows);

  pool.end();
}
run().catch(console.error);

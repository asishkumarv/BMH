const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });

async function check() {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employee_wallets'`);
    console.log("employee_wallets columns:");
    console.table(res.rows);

    const res2 = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manual_orders'`);
    console.log("manual_orders columns:");
    console.table(res2.rows.map(r => r.column_name));
    
    // check employee shifts structure for the scheduled delivery part
    const res3 = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'`);
    console.log("employees columns:");
    console.table(res3.rows.map(r => r.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();

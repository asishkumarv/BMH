const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' }); 
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employees'").then(r => console.log(r.rows)).catch(console.error).finally(()=>pool.end());

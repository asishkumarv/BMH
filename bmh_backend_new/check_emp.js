const { Pool } = require('pg'); 
const pool = new Pool({user: 'postgres', host: 'localhost', database: 'bmh_asish', password: 'password', port: 5432}); 
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'", (err, res) => { 
  console.log(res ? res.rows.map(r=>r.column_name) : err); 
  pool.end(); 
});

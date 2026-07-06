const pool = require('./db');
pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('employees', 'delivery_boys', 'sub_admins')").then(r => {
  console.log(r.rows);
  pool.end();
});

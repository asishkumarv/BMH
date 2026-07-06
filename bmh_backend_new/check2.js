const pool = require('./db');
pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name IN ('push_token', 'schedule_in', 'schedule_out', 'break_in', 'break_out')").then(r => {
  console.log(r.rows);
  pool.end();
});

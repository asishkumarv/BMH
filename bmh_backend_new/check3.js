const pool = require('./db');
pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'push_token'").then(r => {
  console.log(r.rows);
  pool.end();
});

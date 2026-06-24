const pool = require('./db');
pool.query("UPDATE employees SET mobile = '1234567890'")
  .then(() => { console.log('Updated mobile numbers'); process.exit(0); })
  .catch(console.error);

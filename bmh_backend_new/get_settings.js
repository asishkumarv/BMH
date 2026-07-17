const pool = require('./db');

const run = async () => {
  try {
    const res = await pool.query('SELECT key FROM settings');
    console.log("Database Settings Keys:", res.rows.map(r => r.key));
  } catch (err) {
    console.error("DB Query Error:", err.message);
  }
  process.exit(0);
};

run();

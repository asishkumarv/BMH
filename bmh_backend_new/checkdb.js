const pool = require('./db');

async function checkDB() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables in DB:", res.rows.map(r => r.table_name));
    
    const p = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients'
    `);
    console.log("patients columns:", p.rows.map(c => c.column_name));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkDB();

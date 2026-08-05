require('dotenv').config();
const pool = require('./db');

async function verify() {
  try {
    const tables = [
      'rack_assignments',
      'rack_discrepancies',
      'inventory_tasks',
      'inventory_verifications'
    ];
    
    for (const table of tables) {
      const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      console.log(`Table ${table} exists:`, res.rows[0].exists);
    }
  } catch (e) {
    console.error('Verification failed:', e.message);
  } finally {
    pool.end();
  }
}

verify();

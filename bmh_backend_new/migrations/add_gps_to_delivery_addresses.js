const pool = require('../db');

async function migrate() {
  try {
    console.log('Starting DB migration: Adding latitude and longitude to delivery_addresses...');
    
    // Add columns if they do not exist
    await pool.query(`
      ALTER TABLE delivery_addresses 
      ADD COLUMN IF NOT EXISTS latitude NUMERIC,
      ADD COLUMN IF NOT EXISTS longitude NUMERIC
    `);
    
    console.log('DB migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    pool.end();
  }
}

migrate();

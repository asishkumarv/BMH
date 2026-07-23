const pool = require('./db');

async function run() {
  try {
    console.log('Adding doctor_status and doctor_available_time to doctor_slots table...');
    
    // Add columns
    await pool.query(`
      ALTER TABLE doctor_slots 
      ADD COLUMN IF NOT EXISTS doctor_status VARCHAR(50) DEFAULT 'Not Marked',
      ADD COLUMN IF NOT EXISTS doctor_available_time VARCHAR(50) DEFAULT NULL
    `);
    
    console.log('Database patched successfully!');
  } catch (error) {
    console.error('Error patching database:', error);
  } finally {
    pool.end();
  }
}

run();

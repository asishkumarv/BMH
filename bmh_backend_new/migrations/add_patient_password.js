require('dotenv').config({ path: '../.env' });
const pool = require('../db');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding password column to patients table...');
    await client.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    `);
    await client.query('COMMIT');
    console.log('Migration Completed Successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();

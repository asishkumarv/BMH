require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

// Use the existing db connection
const pool = require('../db');

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding new columns to patients table...');
    await client.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR(50),
      ADD COLUMN IF NOT EXISTS city VARCHAR(255),
      ADD COLUMN IF NOT EXISTS pin_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255);
    `);

    console.log('Adding new columns to patient_bookings table...');
    await client.query(`
      ALTER TABLE patient_bookings
      ADD COLUMN IF NOT EXISTS reason_for_visit TEXT;
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

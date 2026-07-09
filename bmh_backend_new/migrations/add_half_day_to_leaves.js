require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Altering leave_requests to support half-day leaves...');
    await client.query(`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS half_day_session VARCHAR(50) DEFAULT NULL;
    `);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();

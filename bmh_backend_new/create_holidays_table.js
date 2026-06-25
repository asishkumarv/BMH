const pool = require('./db');

async function createHolidaysTable() {
  try {
    console.log('Creating holidays table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        department VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('holidays table created successfully.');
  } catch (err) {
    console.error('Error creating holidays table:', err);
  } finally {
    pool.end();
  }
}

createHolidaysTable();

const pool = require('./db');

async function main() {
  try {
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS push_token VARCHAR');
    console.log('Added push_token column to employees table successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();

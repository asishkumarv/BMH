const pool = require('./db');

async function main() {
  try {
    await pool.query('ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS scheduled_notified BOOLEAN DEFAULT false');
    await pool.query('ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS scheduled_notified BOOLEAN DEFAULT false');
    console.log('Added scheduled_notified columns successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();

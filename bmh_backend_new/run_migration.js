const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add payment_mode to wallet_transactions
    await client.query(`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50)`);
    
    // Add payment_txn_id to wallet_transactions
    await client.query(`ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_txn_id VARCHAR(255)`);

    await client.query('COMMIT');
    console.log('Migration successful!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();

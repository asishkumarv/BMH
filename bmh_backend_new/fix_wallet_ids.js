const pool = require('./db');

async function run() {
  try {
    await pool.query('ALTER TABLE employee_wallets DROP CONSTRAINT IF EXISTS employee_wallets_employee_id_fkey');
    await pool.query('ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_employee_id_fkey');
    await pool.query('ALTER TABLE cash_handovers DROP CONSTRAINT IF EXISTS cash_handovers_from_employee_id_fkey');
    await pool.query('ALTER TABLE cash_handovers DROP CONSTRAINT IF EXISTS cash_handovers_to_employee_id_fkey');
    
    await pool.query('ALTER TABLE employee_wallets ALTER COLUMN employee_id TYPE VARCHAR(255)');
    await pool.query('ALTER TABLE wallet_transactions ALTER COLUMN employee_id TYPE VARCHAR(255)');
    await pool.query('ALTER TABLE cash_handovers ALTER COLUMN from_employee_id TYPE VARCHAR(255)');
    await pool.query('ALTER TABLE cash_handovers ALTER COLUMN to_employee_id TYPE VARCHAR(255)');
    console.log("Successfully altered columns to VARCHAR");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    pool.end();
  }
}
run();

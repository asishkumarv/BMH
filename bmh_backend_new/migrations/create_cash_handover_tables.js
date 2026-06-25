const pool = require('../db');

async function migrate() {
  try {
    console.log('Starting Cash Handover migration...');

    // 1. Add cash_in_hand to employee_wallets
    await pool.query(`
      ALTER TABLE employee_wallets 
      ADD COLUMN IF NOT EXISTS cash_in_hand DECIMAL(10,2) DEFAULT 0
    `);
    console.log('Added cash_in_hand to employee_wallets');

    // 2. Create cash_handovers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cash_handovers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_employee_id INTEGER REFERENCES employees(id),
        to_employee_id INTEGER REFERENCES employees(id),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created cash_handovers table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

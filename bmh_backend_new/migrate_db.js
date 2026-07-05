const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://bmh_user:StrivenestBMHPassword7869@187.127.166.240:5432/bmh_asish' });

async function migrate() {
  try {
    // Add columns to manual_orders
    console.log("Updating manual_orders...");
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS pod_payment_mode VARCHAR(50) DEFAULT NULL`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL`);
    await pool.query(`ALTER TABLE manual_orders ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT NULL`);

    // Add columns to online_orders
    console.log("Updating online_orders...");
    await pool.query(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS pod_payment_mode VARCHAR(50) DEFAULT NULL`);
    await pool.query(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL`);
    await pool.query(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT NULL`);

    // Add column to employee_wallets
    console.log("Updating employee_wallets...");
    await pool.query(`ALTER TABLE employee_wallets ADD COLUMN IF NOT EXISTS online_collected NUMERIC DEFAULT 0`);

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();

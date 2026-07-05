const pool = require('./db');

async function migrate() {
  try {
    await pool.query('BEGIN');

    // Add modified columns to patient_bookings
    await pool.query(`
      ALTER TABLE patient_bookings
      ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS modified_by_id VARCHAR,
      ADD COLUMN IF NOT EXISTS modified_by_name VARCHAR,
      ADD COLUMN IF NOT EXISTS modified_by_role VARCHAR,
      ADD COLUMN IF NOT EXISTS modified_by_dept VARCHAR
    `);
    console.log('Added modified columns to patient_bookings');

    // Create cancelled_patient_bookings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cancelled_patient_bookings (
        id SERIAL PRIMARY KEY,
        original_booking_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        patient_id INTEGER,
        token_number INTEGER NOT NULL,
        booked_by VARCHAR,
        payment_mode VARCHAR,
        fee NUMERIC(10,2),
        reason_for_visit TEXT,
        reference VARCHAR,
        pr VARCHAR,
        booked_at TIMESTAMP,
        cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cancelled_by_id VARCHAR,
        cancelled_by_name VARCHAR,
        cancelled_by_role VARCHAR,
        cancelled_by_dept VARCHAR,
        refund_status VARCHAR DEFAULT 'Pending',
        refund_type VARCHAR,
        refund_tnx VARCHAR
      )
    `);
    console.log('Created cancelled_patient_bookings table');

    await pool.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();

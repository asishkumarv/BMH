require('dotenv').config();
const pool = require('./db');

async function alterAttendanceTables() {
  try {
    console.log('Starting attendance schema migration...');

    // 1. Alter employees table
    await pool.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS mobile VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS schedule_in VARCHAR(255),
      ADD COLUMN IF NOT EXISTS schedule_out VARCHAR(255),
      ADD COLUMN IF NOT EXISTS break_in VARCHAR(255),
      ADD COLUMN IF NOT EXISTS break_out VARCHAR(255),
      ADD COLUMN IF NOT EXISTS weekly_off_days VARCHAR(255);
    `);
    console.log('Altered employees table.');

    // 2. Alter departments table
    await pool.query(`
      ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS allowed_latitude NUMERIC,
      ADD COLUMN IF NOT EXISTS allowed_longitude NUMERIC,
      ADD COLUMN IF NOT EXISTS allowed_radius NUMERIC DEFAULT 2000;
    `);
    console.log('Altered departments table.');

    // 3. Drop existing simple attendance table to recreate it with advanced tracking
    await pool.query(`DROP TABLE IF EXISTS attendance CASCADE;`);
    
    await pool.query(`
      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        department VARCHAR(255),
        date DATE DEFAULT CURRENT_DATE,
        timestamp TIMESTAMP, -- Check-In time
        checkout_timestamp TIMESTAMP, -- Check-Out time
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'On Duty',
        session_hours VARCHAR(50),
        late_duration VARCHAR(50),
        early_checkout_duration VARCHAR(50),
        overtime_duration VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Recreated attendance table.');

    // 4. Create break_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS break_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        break_type VARCHAR(50), -- 'Break In' or 'Break Out'
        timestamp TIMESTAMP,
        image_url TEXT,
        status VARCHAR(50), -- 'On Break', 'Returned', 'Rejected'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created break_logs table.');

    // 5. Create attendance_audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        action_type VARCHAR(255), -- 'CHECK_IN_ATTEMPT', 'FAILED_FACE_RECOGNITION', 'FAILED_LOCATION_VALIDATION'
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(255),
        device_info VARCHAR(255),
        location_lat NUMERIC,
        location_lng NUMERIC,
        details TEXT
      );
    `);
    console.log('Created attendance_audit_logs table.');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error in migration:', error);
  } finally {
    pool.end();
  }
}

alterAttendanceTables();

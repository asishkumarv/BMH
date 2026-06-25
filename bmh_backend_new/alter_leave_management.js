require('dotenv').config();
const pool = require('./db');

async function createLeaveTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Creating Leave Management tables...');

    // Department Leave Settings (Limits on how many employees can take leave per day in a department)
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_leave_settings (
        id SERIAL PRIMARY KEY,
        department VARCHAR(255) NOT NULL UNIQUE,
        max_employees_leave_per_day INTEGER DEFAULT 2,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created department_leave_settings table');

    // Role Leave Settings (Leave counts, penalties, late/early limits for roles in a department)
    // department = 'All' means global setting if not overridden
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_leave_settings (
        id SERIAL PRIMARY KEY,
        department VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        leaves_per_month INTEGER DEFAULT 1,
        extra_leave_penalty NUMERIC(10, 2) DEFAULT 0.00,
        late_checkin_limit INTEGER DEFAULT 3,
        late_checkin_penalty NUMERIC(10, 2) DEFAULT 0.00,
        early_checkout_limit INTEGER DEFAULT 3,
        early_checkout_penalty NUMERIC(10, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(department, role)
      );
    `);
    console.log('Created role_leave_settings table');

    // Leave Requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created leave_requests table');

    // Payslips
    await client.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        month VARCHAR(20) NOT NULL,
        base_salary NUMERIC(10, 2) DEFAULT 0.00,
        extra_leave_deduction NUMERIC(10, 2) DEFAULT 0.00,
        late_checkin_deduction NUMERIC(10, 2) DEFAULT 0.00,
        early_checkout_deduction NUMERIC(10, 2) DEFAULT 0.00,
        net_salary NUMERIC(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'generated',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, month)
      );
    `);
    console.log('Created payslips table');

    await client.query('COMMIT');
    console.log('Leave Management tables created successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating leave management tables:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createLeaveTables();

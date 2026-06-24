require('dotenv').config();
const pool = require('./db');

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting full database initialization...');

    // 1. Departments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        allowed_latitude NUMERIC,
        allowed_longitude NUMERIC,
        allowed_radius NUMERIC DEFAULT 2000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Roles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Department Admins Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS department_admins (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Employees Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        role VARCHAR(255),
        status VARCHAR(50) DEFAULT 'approved',
        profile_data TEXT,
        mobile VARCHAR(255),
        image TEXT,
        schedule_in VARCHAR(255),
        schedule_out VARCHAR(255),
        break_in VARCHAR(255),
        break_out VARCHAR(255),
        weekly_off_days VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tasks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigner_type VARCHAR(50) NOT NULL,
        assigner_id INTEGER NOT NULL,
        assignee_type VARCHAR(50) NOT NULL,
        assignee_id INTEGER NOT NULL,
        department VARCHAR(255),
        status VARCHAR(50) DEFAULT 'assigned',
        due_date TIMESTAMP,
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Attendance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        department VARCHAR(255),
        date DATE DEFAULT CURRENT_DATE,
        timestamp TIMESTAMP,
        checkout_timestamp TIMESTAMP,
        image_url TEXT,
        checkout_image_url TEXT,
        status VARCHAR(50) DEFAULT 'On Duty',
        session_hours VARCHAR(50),
        late_duration VARCHAR(50),
        early_checkout_duration VARCHAR(50),
        overtime_duration VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Break Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS break_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        break_type VARCHAR(50),
        timestamp TIMESTAMP,
        image_url TEXT,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Attendance Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        action_type VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(255),
        device_info VARCHAR(255),
        location_lat NUMERIC,
        location_lng NUMERIC,
        details TEXT
      );
    `);

    // 10. Stationary Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock INTEGER DEFAULT 0,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Stationary Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Stationary Request Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stationary_request_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES stationary_requests(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES stationary_items(id) ON DELETE CASCADE,
        requested_qty INTEGER NOT NULL,
        approved_qty INTEGER DEFAULT 0
      );
    `);

    // 13. Employee Wallets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_wallets (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
        balance NUMERIC(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Wallet Transactions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        note TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Super Admins Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default super admin if not exists
    const res = await client.query('SELECT * FROM super_admins WHERE email = $1', ['admin@hospital.com']);
    if (res.rows.length === 0) {
      await client.query(
        'INSERT INTO super_admins (full_name, email, password) VALUES ($1, $2, $3)',
        ['System Admin', 'admin@hospital.com', 'admin123']
      );
      console.log('Inserted default super admin (admin@hospital.com / admin123)');
    }

    await client.query('COMMIT');
    console.log('Database Initialization Completed Successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
  } finally {
    client.release();
    pool.end();
  }
}

initDB();

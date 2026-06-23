require('dotenv').config();
const pool = require('./db');

async function createTables() {
  try {
    // Drop tables if they exist to recreate with new schemas
    await pool.query(`
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
      DROP TABLE IF EXISTS department_admins CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
    `);

    // 1. Departments Table
    await pool.query(`
      CREATE TABLE departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 2. Roles Table
    await pool.query(`
      CREATE TABLE roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Department Admins Table
    await pool.query(`
      CREATE TABLE department_admins (
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
    await pool.query(`
      CREATE TABLE employees (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        role VARCHAR(255),
        status VARCHAR(50) DEFAULT 'approved',
        profile_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Tasks Table
    await pool.query(`
      CREATE TABLE tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending' or 'completed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Attendance Table
    await pool.query(`
      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'present', -- 'present' or 'absent'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      );
    `);

    console.log('Tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    pool.end();
  }
}

createTables();

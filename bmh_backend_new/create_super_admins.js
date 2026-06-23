require('dotenv').config();
const pool = require('./db');

async function createSuperAdmins() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default super admin if not exists
    const res = await pool.query('SELECT * FROM super_admins WHERE email = $1', ['admin@hospital.com']);
    if (res.rows.length === 0) {
      await pool.query(
        'INSERT INTO super_admins (full_name, email, password) VALUES ($1, $2, $3)',
        ['System Admin', 'admin@hospital.com', 'admin123']
      );
      console.log('Inserted default super admin (admin@hospital.com / admin123)');
    } else {
      console.log('Super admin already exists.');
    }

    console.log('Super admins table setup completed.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

createSuperAdmins();

const pool = require('../db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Creating settings table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default setting for doctor management access
    await client.query(`
      INSERT INTO settings (key, value) 
      VALUES ('doctor_management_access', '{"sub_admin": false, "employee": false}')
      ON CONFLICT (key) DO NOTHING;
    `);

    console.log("Creating doctors table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id VARCHAR(50) PRIMARY KEY,
        profile_photo TEXT,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50),
        department VARCHAR(100),
        role VARCHAR(100) DEFAULT 'Doctor',
        experience VARCHAR(255),
        gender VARCHAR(50),
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating doctor_slots table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_slots (
        id SERIAL PRIMARY KEY,
        doctor_id VARCHAR(50) REFERENCES doctors(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_tokens INT NOT NULL,
        fee DECIMAL(10, 2) NOT NULL,
        assigned_peon_id INT REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating patients table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50),
        email VARCHAR(255),
        age INT,
        gender VARCHAR(50),
        medical_history TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating patient_bookings table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_bookings (
        id SERIAL PRIMARY KEY,
        slot_id INT REFERENCES doctor_slots(id) ON DELETE CASCADE,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        token_number INT NOT NULL,
        booked_by INT REFERENCES employees(id) ON DELETE SET NULL,
        payment_mode VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Booked',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating consultations table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        booking_id INT REFERENCES patient_bookings(id) ON DELETE CASCADE,
        doctor_id VARCHAR(50) REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
        notes TEXT,
        next_consultation_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log("Migration completed successfully.");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();

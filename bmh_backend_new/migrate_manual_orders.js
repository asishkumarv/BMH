const pool = require('./db');

async function migrate() {
  try {
    console.log("Adding addresses to patients table...");
    try {
      await pool.query(`ALTER TABLE patients ADD COLUMN addresses JSONB DEFAULT '[]'::jsonb`);
      console.log("Added addresses column.");
    } catch (e) {
      if (e.code === '42701') console.log("addresses column already exists.");
      else throw e;
    }

    console.log("Creating manual_orders table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS manual_orders (
        id SERIAL PRIMARY KEY,
        order_no VARCHAR(100),
        invoice_no VARCHAR(100),
        amount DECIMAL(10,2),
        delivery_charge DECIMAL(10,2),
        mode_of_delivery VARCHAR(50),
        order_date DATE,
        order_time TIME,
        
        customer_phone VARCHAR(50),
        customer_name VARCHAR(255),
        ship_to_phone VARCHAR(50),
        ship_to_name VARCHAR(255),
        address TEXT,
        location_link TEXT,
        
        status VARCHAR(50) DEFAULT 'Pending',
        delivery_boy_id VARCHAR(100),
        created_by_id VARCHAR(100),
        created_by_type VARCHAR(50),
        delivery_otp VARCHAR(10),
        
        payment_mode VARCHAR(50),
        paid_amount DECIMAL(10,2),
        payment_attachment TEXT,
        payment_txn_id VARCHAR(100),
        hand_over_to VARCHAR(255),
        
        bus_travels_name VARCHAR(255),
        bus_driver_name VARCHAR(255),
        bus_driver_number VARCHAR(50),
        bus_number VARCHAR(100),
        bus_front_image TEXT,
        dispatch_time TIMESTAMP,
        est_reach_time TIMESTAMP,
        
        notes JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("manual_orders table created.");

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();

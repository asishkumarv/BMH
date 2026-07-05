const pool = require('../db');
const fs = require('fs');
const path = require('path');

exports.initBusesDB = async () => {
  try {
    const checkRes = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'buses'
      );
    `);
    
    if (!checkRes.rows[0].exists) {
      console.log('📦 "buses" table not found. Auto-creating and populating...');
      const sqlPath = path.join(__dirname, '../import_buses.sql');
      if (fs.existsSync(sqlPath)) {
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sqlScript);
        console.log('✅ "buses" table created and seeded successfully from import_buses.sql');
      } else {
        console.log('⚠️ import_buses.sql not found, skipping seeding.');
      }
    }
  } catch (err) {
    console.error('Error initializing buses DB:', err.message);
  }
};

exports.getBuses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM buses ORDER BY bus_name ASC");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching buses' });
  }
};

exports.addBus = async (req, res) => {
  try {
    const { bus_name, operator_name, bus_number, route_code, departure_time } = req.body;
    const result = await pool.query(`
      INSERT INTO buses (bus_name, operator_name, bus_number, route_code, departure_time, status)
      VALUES ($1, $2, $3, $4, $5, 'Active') RETURNING *
    `, [bus_name, operator_name, bus_number, route_code, departure_time]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding bus:', error);
    res.status(500).json({ success: false, message: 'Server error adding bus' });
  }
};

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
    const { 
      bus_name, operator_name, bus_number, route_code, source, 
      destination, departure_time, parcel_contact_person, mobile_no, 
      status, remarks 
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO buses (
        bus_name, operator_name, bus_number, route_code, source, 
        destination, departure_time, parcel_contact_person, mobile_no, 
        status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `, [
      bus_name || null, operator_name || null, bus_number || null, 
      route_code || null, source || null, destination || null, 
      departure_time || null, parcel_contact_person || null, 
      mobile_no || null, status || 'Active', remarks || null
    ]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding bus:', error);
    res.status(500).json({ success: false, message: 'Server error adding bus' });
  }
};

exports.updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      bus_name, operator_name, bus_number, route_code, source, 
      destination, departure_time, parcel_contact_person, mobile_no, 
      status, remarks 
    } = req.body;
    
    const result = await pool.query(`
      UPDATE buses 
      SET bus_name = $1, operator_name = $2, bus_number = $3, 
          route_code = $4, source = $5, destination = $6, 
          departure_time = $7, parcel_contact_person = $8, 
          mobile_no = $9, status = $10, remarks = $11
      WHERE id = $12 
      RETURNING *
    `, [
      bus_name || null, operator_name || null, bus_number || null, 
      route_code || null, source || null, destination || null, 
      departure_time || null, parcel_contact_person || null, 
      mobile_no || null, status || 'Active', remarks || null,
      id
    ]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(500).json({ success: false, message: 'Server error updating bus' });
  }
};

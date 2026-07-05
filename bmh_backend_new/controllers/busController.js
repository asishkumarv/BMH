const pool = require('../db');

exports.getBuses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM buses WHERE status = 'Active' ORDER BY bus_name ASC");
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

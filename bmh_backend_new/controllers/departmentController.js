const pool = require('../db');

exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM departments ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const checkResult = await pool.query('SELECT * FROM departments WHERE name ILIKE $1', [name]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    const insertResult = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );

    res.status(201).json({ success: true, data: insertResult.rows[0] });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ success: false, message: 'Server error adding department' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { name, lat, lng, radius } = req.body;
    if (!name || !lat || !lng || !radius) return res.status(400).json({ success: false, message: 'Missing fields' });
    await pool.query(
      'UPDATE departments SET allowed_latitude = $1, allowed_longitude = $2, allowed_radius = $3 WHERE name = $4',
      [lat, lng, radius, name]
    );
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false });
  }
};
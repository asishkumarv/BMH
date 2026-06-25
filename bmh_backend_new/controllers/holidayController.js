const pool = require('../db');

// Get all holidays (filtered by department if provided)
exports.getHolidays = async (req, res) => {
  try {
    const { department, month } = req.query;
    
    let query = 'SELECT * FROM holidays WHERE 1=1';
    let values = [];
    let idx = 1;

    if (department && department !== 'All') {
      query += ` AND department IN ($${idx++}, 'All')`;
      values.push(department);
    }
    
    if (month) {
      // month is expected to be 'YYYY-MM'
      query += ` AND TO_CHAR(date, 'YYYY-MM') = $${idx++}`;
      values.push(month);
    }

    query += ' ORDER BY date ASC';

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a holiday
exports.createHoliday = async (req, res) => {
  try {
    const { department, date, description } = req.body;
    
    if (!department || !date || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // check if it already exists
    const existing = await pool.query(
      'SELECT id FROM holidays WHERE department = $1 AND date = $2',
      [department, date]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Holiday already exists for this date and department' });
    }

    const result = await pool.query(
      'INSERT INTO holidays (department, date, description) VALUES ($1, $2, $3) RETURNING *',
      [department, date, description]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a holiday
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM holidays WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    res.status(200).json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

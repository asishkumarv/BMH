const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all doctor schedules (unauthenticated)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctor_schedules ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching doctor schedules:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST a new doctor schedule
router.post('/', async (req, res) => {
  const { name, qualification, department, schedule_type, timing, cabin, fee, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Doctor Name is required' });
  }
  try {
    const query = `
      INSERT INTO doctor_schedules (name, qualification, department, schedule_type, timing, cabin, fee, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [name, qualification || '', department || '', schedule_type || 'Daily', timing || '', cabin || '', fee || '', notes || '']);
    res.json({ success: true, message: 'Doctor schedule created successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error creating doctor schedule:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update a doctor schedule
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, qualification, department, schedule_type, timing, cabin, fee, notes } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Doctor Name is required' });
  }
  try {
    const query = `
      UPDATE doctor_schedules
      SET name = $1,
          qualification = $2,
          department = $3,
          schedule_type = $4,
          timing = $5,
          cabin = $6,
          fee = $7,
          notes = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    const result = await pool.query(query, [name, qualification || '', department || '', schedule_type || 'Daily', timing || '', cabin || '', fee || '', notes || '', id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor schedule not found' });
    }
    res.json({ success: true, message: 'Doctor schedule updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error updating doctor schedule:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE a doctor schedule
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM doctor_schedules WHERE id = $1 RETURNING *');
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Doctor schedule not found' });
    }
    res.json({ success: true, message: 'Doctor schedule deleted successfully' });
  } catch (err) {
    console.error('Error deleting doctor schedule:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

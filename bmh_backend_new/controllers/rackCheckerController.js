const pool = require('../db');

exports.getRacksList = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT rack 
      FROM ecogreen_medicines 
      WHERE rack IS NOT NULL AND rack != '' AND rack != '-'
      ORDER BY rack ASC
    `);
    res.json({ success: true, racks: result.rows.map(r => r.rack) });
  } catch (error) {
    console.error('getRacksList error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getRackMedicines = async (req, res) => {
  try {
    const { rack } = req.params;
    const result = await pool.query(`
      SELECT id, c_item_code, itemname, rack, batchno, stockbalqty, expirydate, mrp, salerate
      FROM ecogreen_medicines 
      WHERE rack = $1 
      ORDER BY itemname ASC
    `, [rack]);
    res.json({ success: true, medicines: result.rows });
  } catch (error) {
    console.error('getRackMedicines error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.assignRacks = async (req, res) => {
  try {
    const { assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number } = req.body;
    const racks = Array.isArray(rack_number) ? rack_number : [rack_number];
    
    for (const r of racks) {
      const check = await pool.query(
        'SELECT id FROM rack_assignments WHERE assigned_to = $1 AND rack_number = $2 AND status = $3',
        [assigned_to, r, 'Not Checked']
      );
      if (check.rows.length === 0) {
        await pool.query(
          'INSERT INTO rack_assignments (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number) VALUES ($1, $2, $3, $4, $5)',
          [assigned_by, assigned_to, assigned_to_name, assigned_to_role, r]
        );
      }
    }
    res.json({ success: true, message: 'Rack(s) assigned successfully' });
  } catch (error) {
    console.error('assignRacks error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { assigned_to } = req.query;
    let query = 'SELECT * FROM rack_assignments';
    let params = [];
    if (assigned_to) {
      query += ' WHERE assigned_to = $1';
      params.push(assigned_to);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getAssignments error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query(
      'UPDATE rack_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    res.json({ success: true, message: 'Assignment status updated successfully' });
  } catch (error) {
    console.error('updateAssignmentStatus error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.submitDiscrepancy = async (req, res) => {
  try {
    const { assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description } = req.body;
    await pool.query(
      `INSERT INTO rack_discrepancies 
       (assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description]
    );
    res.json({ success: true, message: 'Discrepancy reported successfully' });
  } catch (error) {
    console.error('submitDiscrepancy error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getDiscrepancies = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT rd.*, ra.rack_number 
      FROM rack_discrepancies rd 
      JOIN rack_assignments ra ON rd.assignment_id = ra.id
    `;
    let params = [];
    if (status) {
      query += ' WHERE rd.status = $1';
      params.push(status);
    }
    query += ' ORDER BY rd.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getDiscrepancies error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.reviewDiscrepancy = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const discRes = await pool.query('SELECT * FROM rack_discrepancies WHERE id = $1', [id]);
    if (discRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Discrepancy not found' });
    }
    
    const discrepancy = discRes.rows[0];
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE rack_discrepancies SET status = $1 WHERE id = $2',
      [status, id]
    );
    
    if (status === 'approved') {
      const { medicine_id, reported_qty, discrepancy_type } = discrepancy;
      if (reported_qty !== null && (discrepancy_type === 'missing stock' || discrepancy_type === 'excess stock' || discrepancy_type === 'damaged item')) {
        await pool.query(
          'UPDATE ecogreen_medicines SET stockbalqty = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [reported_qty, medicine_id]
        );
      }
    }
    
    await pool.query('COMMIT');
    res.json({ success: true, message: `Discrepancy ${status} successfully` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('reviewDiscrepancy error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

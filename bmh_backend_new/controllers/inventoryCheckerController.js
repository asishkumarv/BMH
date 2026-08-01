const pool = require('../db');

exports.assignTasks = async (req, res) => {
  try {
    const { assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number } = req.body;
    const racks = Array.isArray(rack_number) ? rack_number : [rack_number];
    
    for (const r of racks) {
      const check = await pool.query(
        'SELECT id FROM inventory_tasks WHERE assigned_to = $1 AND rack_number = $2 AND status = $3',
        [assigned_to, r, 'pending']
      );
      if (check.rows.length === 0) {
        await pool.query(
          'INSERT INTO inventory_tasks (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number) VALUES ($1, $2, $3, $4, $5)',
          [assigned_by, assigned_to, assigned_to_name, assigned_to_role, r]
        );
      }
    }
    res.json({ success: true, message: 'Inventory task(s) assigned successfully' });
  } catch (error) {
    console.error('assignTasks error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { assigned_to } = req.query;
    let query = 'SELECT * FROM inventory_tasks';
    let params = [];
    if (assigned_to) {
      query += ' WHERE assigned_to = $1';
      params.push(assigned_to);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getTasks error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.submitVerification = async (req, res) => {
  try {
    const { task_id, medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp, stock_availability, is_mismatch, mismatch_details } = req.body;
    
    await pool.query(
      `INSERT INTO inventory_verifications 
       (task_id, medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp, stock_availability, is_mismatch, mismatch_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        task_id, medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp, stock_availability, is_mismatch, 
        typeof mismatch_details === 'object' ? JSON.stringify(mismatch_details) : mismatch_details,
        is_mismatch ? 'pending' : 'approved'
      ]
    );

    const taskRes = await pool.query('SELECT rack_number FROM inventory_tasks WHERE id = $1', [task_id]);
    if (taskRes.rows.length > 0) {
      const rack = taskRes.rows[0].rack_number;
      const medsRes = await pool.query('SELECT id FROM ecogreen_medicines WHERE rack = $1', [rack]);
      const totalMeds = medsRes.rows.length;
      
      const verRes = await pool.query('SELECT DISTINCT medicine_id FROM inventory_verifications WHERE task_id = $1', [task_id]);
      const verifiedMeds = verRes.rows.length;
      
      if (verifiedMeds >= totalMeds) {
        await pool.query('UPDATE inventory_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['completed', task_id]);
      }
    }

    res.json({ success: true, message: 'Verification details submitted successfully' });
  } catch (error) {
    console.error('submitVerification error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getVerifications = async (req, res) => {
  try {
    const { status, is_mismatch } = req.query;
    let query = `
      SELECT iv.*, it.rack_number, it.assigned_to_name, it.assigned_to
      FROM inventory_verifications iv
      JOIN inventory_tasks it ON iv.task_id = it.id
    `;
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`iv.status = $${paramIndex++}`);
      params.push(status);
    }
    if (is_mismatch) {
      conditions.push(`iv.is_mismatch = $${paramIndex++}`);
      params.push(is_mismatch === 'true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY iv.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getVerifications error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.reviewVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const verRes = await pool.query('SELECT * FROM inventory_verifications WHERE id = $1', [id]);
    if (verRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }
    const verification = verRes.rows[0];
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE inventory_verifications SET status = $1 WHERE id = $2',
      [status, id]
    );
    
    if (status === 'approved' && verification.is_mismatch) {
      const { medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp } = verification;
      await pool.query(`
        UPDATE ecogreen_medicines 
        SET 
          itemname = COALESCE($1, itemname),
          batchno = COALESCE($2, batchno),
          expirydate = COALESCE($3, expirydate),
          stockbalqty = COALESCE($4, stockbalqty),
          mrp = COALESCE($5, mrp),
          salerate = COALESCE($6, salerate),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [product_name, batch_number, expiry_date, quantity, mrp, selling_price, medicine_id]);
    }
    
    await pool.query('COMMIT');
    res.json({ success: true, message: `Verification status ${status} successfully` });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('reviewVerification error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

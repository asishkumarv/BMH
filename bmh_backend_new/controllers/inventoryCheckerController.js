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
    const { 
      task_id, medicine_id, product_name, batch_number, expiry_date, quantity, 
      selling_price, purchase_price, mrp, stock_availability, is_mismatch, 
      mismatch_details, purchase_entry_employee, pack_size, purchase_entry_error 
    } = req.body;
    
    await pool.query(
      `INSERT INTO inventory_verifications 
       (task_id, medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp, stock_availability, is_mismatch, mismatch_details, status, purchase_entry_employee, pack_size, purchase_entry_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        task_id, medicine_id, product_name, batch_number, expiry_date, quantity, selling_price, purchase_price, mrp, stock_availability, is_mismatch, 
        typeof mismatch_details === 'object' ? JSON.stringify(mismatch_details) : mismatch_details,
        is_mismatch ? 'pending' : 'approved',
        purchase_entry_employee || null,
        pack_size || null,
        purchase_entry_error || false
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
        await pool.query(
          "UPDATE inventory_tasks SET status = $1, end_time = CURRENT_TIMESTAMP, duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          ['completed', task_id]
        );
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
      SELECT iv.*, it.rack_number, it.assigned_to_name, it.assigned_to, em.c_item_code as item_code
      FROM inventory_verifications iv
      JOIN inventory_tasks it ON iv.task_id = it.id
      LEFT JOIN ecogreen_medicines em ON iv.medicine_id = em.id
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
    const { status, reviewed_by, reviewed_by_name } = req.body;
    
    const verRes = await pool.query('SELECT * FROM inventory_verifications WHERE id = $1', [id]);
    if (verRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification not found' });
    }
    const verification = verRes.rows[0];
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE inventory_verifications SET status = $1, reviewed_by = $2, reviewed_by_name = $3 WHERE id = $4',
      [status, reviewed_by || null, reviewed_by_name || null, id]
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

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    let query = 'UPDATE inventory_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP';
    let params = [status];
    let paramIdx = 2;
    
    if (status === 'In Progress') {
      query += ', start_time = CURRENT_TIMESTAMP';
    } else if (status === 'completed') {
      query += ', end_time = CURRENT_TIMESTAMP, duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER';
    }
    
    if (remarks !== undefined) {
      query += `, remarks = $${paramIdx++}`;
      params.push(remarks);
    }
    
    query += ` WHERE id = $${paramIdx}`;
    params.push(id);
    
    await pool.query(query, params);
    res.json({ success: true, message: 'Task status updated successfully' });
  } catch (error) {
    console.error('updateTaskStatus error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.sendReorganization = async (req, res) => {
  try {
    const { verification_id, assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, corrected_items } = req.body;
    
    await pool.query('BEGIN');
    
    // Create a rack organization assignment of type 'reorganization'
    const result = await pool.query(
      `INSERT INTO rack_assignments 
       (assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, status, assignment_type, verification_id, corrected_items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [assigned_by, assigned_to, assigned_to_name, assigned_to_role, rack_number, 'Not Checked', 'reorganization', verification_id, JSON.stringify(corrected_items)]
    );
    
    // Update verification status
    await pool.query(
      `UPDATE inventory_verifications SET status = 'sent_to_reorg' WHERE id = $1`,
      [verification_id]
    );
    
    await pool.query('COMMIT');
    res.json({ success: true, message: 'Re-organization task assigned successfully', assignment_id: result.rows[0].id });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('sendReorganization error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

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
    const { status, remarks, sku_count, batch_count, total_qty } = req.body;
    
    let query = 'UPDATE rack_assignments SET status = $1, updated_at = CURRENT_TIMESTAMP';
    let params = [status];
    let paramIdx = 2;
    
    if (status === 'In Progress') {
      query += `, start_time = CURRENT_TIMESTAMP`;
    } else if (status === 'Completed') {
      query += `, end_time = CURRENT_TIMESTAMP, duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))::INTEGER`;
      
      let computedSkus = sku_count !== undefined ? parseInt(sku_count) : undefined;
      let computedBatches = batch_count !== undefined ? parseInt(batch_count) : undefined;
      let computedQty = total_qty !== undefined ? parseInt(total_qty) : undefined;
      
      if (sku_count === undefined || batch_count === undefined || total_qty === undefined) {
        const assignRes = await pool.query('SELECT rack_number FROM rack_assignments WHERE id = $1', [id]);
        if (assignRes.rows.length > 0) {
          const rackNum = assignRes.rows[0].rack_number;
          const medsRes = await pool.query(
            `SELECT COUNT(DISTINCT c_item_code) as sku_count, 
                    COUNT(DISTINCT batchno) as batch_count, 
                    SUM(stockbalqty) as total_qty 
             FROM ecogreen_medicines 
             WHERE rack = $1`, 
            [rackNum]
          );
          if (medsRes.rows.length > 0) {
            computedSkus = computedSkus !== undefined ? computedSkus : parseInt(medsRes.rows[0].sku_count || 0);
            computedBatches = computedBatches !== undefined ? computedBatches : parseInt(medsRes.rows[0].batch_count || 0);
            computedQty = computedQty !== undefined ? computedQty : parseInt(medsRes.rows[0].total_qty || 0);
          }
        }
      }
      
      if (computedSkus !== undefined) {
        query += `, sku_count = $${paramIdx++}`;
        params.push(computedSkus);
      }
      if (computedBatches !== undefined) {
        query += `, batch_count = $${paramIdx++}`;
        params.push(computedBatches);
      }
      if (computedQty !== undefined) {
        query += `, total_qty = $${paramIdx++}`;
        params.push(computedQty);
      }
    }
    
    if (remarks !== undefined) {
      query += `, remarks = $${paramIdx++}`;
      params.push(remarks);
    }
    
    query += ` WHERE id = $${paramIdx}`;
    params.push(id);
    
    await pool.query(query, params);
    res.json({ success: true, message: 'Assignment status updated successfully' });
  } catch (error) {
    console.error('updateAssignmentStatus error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.submitDiscrepancy = async (req, res) => {
  try {
    const { assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description, reported_mrp } = req.body;
    await pool.query(
      `INSERT INTO rack_discrepancies 
       (assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description, reported_mrp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [assignment_id, reported_by, reported_by_name, medicine_id, product_name, discrepancy_type, reported_qty, description, reported_mrp]
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
      SELECT rd.*, ra.rack_number, em.batchno as batch_no, em.c_item_code as item_code
      FROM rack_discrepancies rd 
      JOIN rack_assignments ra ON rd.assignment_id = ra.id
      LEFT JOIN ecogreen_medicines em ON rd.medicine_id = em.id
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
    const { status, reviewed_by, reviewed_by_name } = req.body;
    
    const discRes = await pool.query('SELECT * FROM rack_discrepancies WHERE id = $1', [id]);
    if (discRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Discrepancy not found' });
    }
    
    const discrepancy = discRes.rows[0];
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE rack_discrepancies SET status = $1, reviewed_by = $2, reviewed_by_name = $3 WHERE id = $4',
      [status, reviewed_by || null, reviewed_by_name || null, id]
    );
    
    if (status === 'approved') {
      const { medicine_id, reported_qty, discrepancy_type, reported_mrp } = discrepancy;
      if (reported_qty !== null && (discrepancy_type === 'missing stock' || discrepancy_type === 'excess stock' || discrepancy_type === 'damaged item' || discrepancy_type === 'expired')) {
        await pool.query(
          'UPDATE ecogreen_medicines SET stockbalqty = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [reported_qty, medicine_id]
        );
      }
      if (reported_mrp !== null) {
        await pool.query(
          'UPDATE ecogreen_medicines SET mrp = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [reported_mrp, medicine_id]
        );
      }
      if (discrepancy_type === 'wrong item') {
        try {
          const wrongDetails = JSON.parse(description);
          if (wrongDetails.actual_item_id) {
            // Update actual item's stock and rack number
            await pool.query(
              `UPDATE ecogreen_medicines 
               SET stockbalqty = $1, rack = (SELECT rack_number FROM rack_assignments WHERE id = $2), updated_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              [wrongDetails.actual_item_stock, assignment_id, wrongDetails.actual_item_id]
            );
            // Clear rack of the wrong medicine assigned
            await pool.query(
              "UPDATE ecogreen_medicines SET rack = '', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
              [medicine_id]
            );
          }
        } catch (e) {
          console.error('Error parsing wrong item details:', e);
        }
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

exports.searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, medicines: [] });
    }
    const result = await pool.query(`
      SELECT id, c_item_code, itemname, rack, batchno, stockbalqty, expirydate, mrp 
      FROM ecogreen_medicines 
      WHERE itemname ILIKE $1 OR c_item_code ILIKE $1 
      ORDER BY itemname ASC 
      LIMIT 20
    `, [`%${q}%`]);
    res.json({ success: true, medicines: result.rows });
  } catch (error) {
    console.error('searchMedicines error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getPerformanceStats = async (req, res) => {
  try {
    // Get rack checker assignments summary grouped by employee
    const rackStats = await pool.query(`
      SELECT 
        assigned_to_name,
        assigned_to_role,
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN status = 'Verified' THEN 1 END) as total_completed,
        AVG(CASE WHEN status = 'Verified' AND duration IS NOT NULL THEN duration END) as avg_duration_seconds
      FROM rack_assignments
      GROUP BY assigned_to_name, assigned_to_role
    `);
    
    // Get discrepancy summary grouped by type
    const discrepancyStats = await pool.query(`
      SELECT discrepancy_type, COUNT(*) as count
      FROM rack_discrepancies
      GROUP BY discrepancy_type
    `);
    
    // Get inventory checker task stats
    const inventoryStats = await pool.query(`
      SELECT 
        assigned_to_name,
        assigned_to_role,
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        AVG(CASE WHEN status = 'completed' AND duration IS NOT NULL THEN duration END) as avg_duration_seconds
      FROM inventory_tasks
      GROUP BY assigned_to_name, assigned_to_role
    `);
    
    // Get mismatch verification breakdown including purchase entry errors
    const verificationStats = await pool.query(`
      SELECT 
        is_mismatch,
        purchase_entry_error,
        COUNT(*) as count
      FROM inventory_verifications
      GROUP BY is_mismatch, purchase_entry_error
    `);
    
    // Get purchase entry errors by employee
    const purchaseEntryErrorStats = await pool.query(`
      SELECT 
        purchase_entry_employee,
        COUNT(*) as error_count
      FROM inventory_verifications
      WHERE purchase_entry_error = true AND purchase_entry_employee IS NOT NULL AND purchase_entry_employee != ''
      GROUP BY purchase_entry_employee
      ORDER BY error_count DESC
    `);

    res.json({
      success: true,
      rack_checker: rackStats.rows,
      discrepancies: discrepancyStats.rows,
      inventory_checker: inventoryStats.rows,
      verifications: verificationStats.rows,
      purchase_entry_errors: purchaseEntryErrorStats.rows
    });
  } catch (error) {
    console.error('getPerformanceStats error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

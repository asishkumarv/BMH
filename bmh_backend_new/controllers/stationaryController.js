const pool = require('../db');

// --- Inventory Management ---

exports.getItems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stationary_items ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching stationary items:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addItem = async (req, res) => {
  try {
    const { name, stock, image } = req.body;
    const result = await pool.query(
      'INSERT INTO stationary_items (name, stock, image) VALUES ($1, $2, $3) RETURNING *',
      [name, stock || 0, image]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error adding stationary item:', error);
    res.status(500).json({ success: false, message: 'Server error adding item' });
  }
};

exports.addBulkItems = async (req, res) => {
  try {
    const { items } = req.body; // Array of { name, stock, image }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        await client.query(
          'INSERT INTO stationary_items (name, stock, image) VALUES ($1, $2, $3)',
          [item.name, item.stock || 0, item.image]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, message: `${items.length} items added successfully` });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding bulk stationary items:', error);
    res.status(500).json({ success: false, message: 'Server error adding bulk items' });
  }
};

exports.updateItemStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;
    const result = await pool.query(
      'UPDATE stationary_items SET stock = $1 WHERE id = $2 RETURNING *',
      [stock, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stock, image, status } = req.body;
    
    // Build dynamic update query
    let updates = [];
    let values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (stock !== undefined) {
      updates.push(`stock = $${paramIndex++}`);
      values.push(stock);
    }
    if (image !== undefined) {
      updates.push(`image = $${paramIndex++}`);
      values.push(image);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE stationary_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stationary_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- Requests Management ---

exports.createRequest = async (req, res) => {
  try {
    const { employee_id, notes, items, requester_type, requester_id } = req.body; // items: array of { item_id, requested_qty }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let empId = employee_id;
      if (requester_type === 'department_admin' && requester_id) {
        // Query the corresponding employee ID by matching email of this department admin
        const empRes = await client.query(
          'SELECT id FROM employees WHERE email = (SELECT email FROM department_admins WHERE id = $1)',
          [requester_id]
        );
        if (empRes.rows.length > 0) {
          empId = empRes.rows[0].id;
        }
      }

      const reqResult = await client.query(
        'INSERT INTO stationary_requests (employee_id, notes, status, requester_type, requester_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [empId, notes, 'pending', requester_type || 'employee', requester_id || empId]
      );
      const requestId = reqResult.rows[0].id;

      for (const item of items) {
        await client.query(
          'INSERT INTO stationary_request_items (request_id, item_id, requested_qty) VALUES ($1, $2, $3)',
          [requestId, item.item_id, item.requested_qty]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ success: true, data: reqResult.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ success: false, message: 'Server error creating request' });
  }
};

exports.getRequests = async (req, res) => {
  try {
    // Run schema migrations for sub admin requester columns
    await pool.query(`
      ALTER TABLE stationary_requests ADD COLUMN IF NOT EXISTS requester_type VARCHAR(50) DEFAULT 'employee';
      ALTER TABLE stationary_requests ADD COLUMN IF NOT EXISTS requester_id INTEGER;
    `);

    const { employee_id, department, department_id, requester_id, requester_type } = req.query; // If provided, filter by employee or department
    
    let query = `
      SELECT 
        sr.*,
        (CASE 
          WHEN sr.requester_type = 'department_admin' THEN (SELECT full_name FROM department_admins WHERE id = sr.requester_id)
          ELSE (SELECT full_name FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
        END) as employee_name,
        (CASE 
          WHEN sr.requester_type = 'department_admin' THEN (SELECT d.name FROM departments d JOIN department_admins da ON da.department_id = d.id WHERE da.id = sr.requester_id)
          ELSE (SELECT department FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
        END) as employee_department,
        (
          SELECT json_agg(json_build_object(
            'id', sri.id,
            'item_id', sri.item_id,
            'name', si.name,
            'requested_qty', sri.requested_qty,
            'approved_qty', sri.approved_qty
          ))
          FROM stationary_request_items sri
          JOIN stationary_items si ON sri.item_id = si.id
          WHERE sri.request_id = sr.id
        ) as items
      FROM stationary_requests sr
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (employee_id) {
      query += ` AND sr.employee_id = $${paramIndex}`;
      params.push(employee_id);
      paramIndex++;
    }

    if (requester_id && requester_type) {
      query += ` AND sr.requester_id = $${paramIndex} AND sr.requester_type = $${paramIndex + 1}`;
      params.push(requester_id, requester_type);
      paramIndex += 2;
    }

    if (department_id) {
      const deptRes = await pool.query('SELECT name FROM departments WHERE id = $1', [department_id]);
      if (deptRes.rows.length > 0) {
        query += ` AND (CASE 
          WHEN sr.requester_type = 'department_admin' THEN (SELECT d.name FROM departments d JOIN department_admins da ON da.department_id = d.id WHERE da.id = sr.requester_id)
          ELSE (SELECT department FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
        END) = $${paramIndex} AND sr.requester_type = 'employee'`;
        params.push(deptRes.rows[0].name);
        paramIndex++;
      } else {
        return res.json({ success: true, data: [] });
      }
    } else if (department) {
      query += ` AND (CASE 
        WHEN sr.requester_type = 'department_admin' THEN (SELECT d.name FROM departments d JOIN department_admins da ON da.department_id = d.id WHERE da.id = sr.requester_id)
        ELSE (SELECT department FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
      END) = $${paramIndex} AND sr.requester_type = 'employee'`;
      params.push(department);
      paramIndex++;
    }
    
    query += ' ORDER BY sr.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_items, approved_by } = req.body; 
    // status: 'approved', 'partially_approved', 'rejected'
    // approved_items: array of { item_id, approved_qty } (only needed if approving)

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update request status and approved_by
      const reqResult = await client.query(
        'UPDATE stationary_requests SET status = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [status, approved_by || null, id]
      );

      if (reqResult.rows.length === 0) {
        throw new Error('Request not found');
      }

      if (status !== 'rejected' && approved_items && approved_items.length > 0) {
        for (const item of approved_items) {
          // Update the approved quantity in the request items table
          await client.query(
            'UPDATE stationary_request_items SET approved_qty = $1 WHERE request_id = $2 AND item_id = $3',
            [item.approved_qty, id, item.item_id]
          );

          // Deduct from inventory stock
          await client.query(
            'UPDATE stationary_items SET stock = GREATEST(stock - $1, 0) WHERE id = $2',
            [item.approved_qty, item.item_id]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Request processed' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

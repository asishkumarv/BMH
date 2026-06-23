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
    const { employee_id, notes, items } = req.body; // items: array of { item_id, requested_qty }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const reqResult = await client.query(
        'INSERT INTO stationary_requests (employee_id, notes, status) VALUES ($1, $2, $3) RETURNING *',
        [employee_id, notes, 'pending']
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
    const { employee_id, department } = req.query; // If provided, filter by employee or department
    
    let query = `
      SELECT 
        sr.*,
        e.full_name as employee_name,
        e.department as employee_department,
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
      JOIN employees e ON sr.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (employee_id) {
      query += ` AND sr.employee_id = $${paramIndex}`;
      params.push(employee_id);
      paramIndex++;
    }

    if (department) {
      query += ` AND e.department = $${paramIndex}`;
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
    const { status, approved_items } = req.body; 
    // status: 'approved', 'partially_approved', 'rejected'
    // approved_items: array of { item_id, approved_qty } (only needed if approving)

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update request status
      const reqResult = await client.query(
        'UPDATE stationary_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
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

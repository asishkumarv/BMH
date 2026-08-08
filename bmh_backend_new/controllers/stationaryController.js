const pool = require('../db');
const { notifyAssignee } = require('../utils/pushNotification');

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
      let reqName = '';
      let reqRole = 'Employee';
      let reqDept = '';

      if (requester_type === 'department_admin' && requester_id) {
        const adminRes = await client.query(
          'SELECT da.full_name, d.name as department FROM department_admins da LEFT JOIN departments d ON da.department_id = d.id WHERE da.id = $1',
          [requester_id]
        );
        if (adminRes.rows.length > 0) {
          reqName = adminRes.rows[0].full_name;
          reqRole = 'Sub Admin';
          reqDept = adminRes.rows[0].department || '';
        }
        
        const empRes = await client.query(
          'SELECT id FROM employees WHERE email = (SELECT email FROM department_admins WHERE id = $1)',
          [requester_id]
        );
        if (empRes.rows.length > 0) {
          empId = empRes.rows[0].id;
        }
      } else {
        const empRes = await client.query(
          'SELECT full_name, role, department FROM employees WHERE id = $1',
          [requester_id || employee_id]
        );
        if (empRes.rows.length > 0) {
          reqName = empRes.rows[0].full_name;
          reqRole = empRes.rows[0].role || 'Employee';
          reqDept = empRes.rows[0].department || '';
        }
      }

      const reqResult = await client.query(
        'INSERT INTO stationary_requests (employee_id, notes, status, requester_type, requester_id, requester_name, requester_role, requester_dept) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [empId, notes, 'pending', requester_type || 'employee', requester_id || empId, reqName, reqRole, reqDept]
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
        COALESCE(sr.requester_name, (CASE 
          WHEN sr.requester_type = 'department_admin' THEN (SELECT full_name FROM department_admins WHERE id = sr.requester_id)
          ELSE (SELECT full_name FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
        END)) as employee_name,
        COALESCE(sr.requester_dept, (CASE 
          WHEN sr.requester_type = 'department_admin' THEN (SELECT d.name FROM departments d JOIN department_admins da ON da.department_id = d.id WHERE da.id = sr.requester_id)
          ELSE (SELECT department FROM employees WHERE id = COALESCE(sr.requester_id, sr.employee_id))
        END)) as employee_department,
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
    const { status, approved_items, approved_by, approved_by_name, approved_by_role, approved_by_dept } = req.body; 
    // status: 'approved', 'partially_approved', 'rejected'
    // approved_items: array of { item_id, approved_qty } (only needed if approving)

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update request status and approved_by
      const reqResult = await client.query(
        `UPDATE stationary_requests 
         SET status = $1, approved_by = $2, approved_by_name = $3, approved_by_role = $4, approved_by_dept = $5, 
             approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $6 RETURNING *`,
        [status, approved_by || null, approved_by_name || null, approved_by_role || null, approved_by_dept || null, id]
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

exports.createRefillRequest = async (req, res) => {
  try {
    const { item_id, notes, requester_type, requester_id } = req.body;
    let reqName = '';
    let reqRole = '';
    let reqDept = '';

    if (requester_type === 'department_admin') {
      const adminRes = await pool.query(
        'SELECT da.full_name, d.name as department FROM department_admins da LEFT JOIN departments d ON da.department_id = d.id WHERE da.id = $1',
        [requester_id]
      );
      if (adminRes.rows.length > 0) {
        reqName = adminRes.rows[0].full_name;
        reqRole = 'Sub Admin';
        reqDept = adminRes.rows[0].department || '';
      }
    } else {
      const empRes = await pool.query(
        'SELECT full_name, role, department FROM employees WHERE id = $1',
        [requester_id]
      );
      if (empRes.rows.length > 0) {
        reqName = empRes.rows[0].full_name;
        reqRole = empRes.rows[0].role || 'Employee';
        reqDept = empRes.rows[0].department || '';
      }
    }

    const result = await pool.query(
      `INSERT INTO stationary_refills (
        item_id, requested_by_type, requested_by_id, requested_by_name, requested_by_role, requested_by_dept, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Requested') RETURNING *`,
      [item_id, requester_type || 'sub_admin', requester_id, reqName, reqRole, reqDept, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating refill request:', error);
    res.status(500).json({ success: false, message: 'Server error creating refill request' });
  }
};

exports.getRefills = async (req, res) => {
  try {
    const { assigned_to_id, assigned_to_type } = req.query;
    let query = `
      SELECT 
        r.*, 
        si.name as item_name, 
        si.image as item_image,
        si.stock as current_stock,
        COALESCE(r.requested_by_name, (CASE 
          WHEN r.requested_by_type = 'department_admin' THEN (SELECT full_name FROM department_admins WHERE id = r.requested_by_id)
          ELSE (SELECT full_name FROM employees WHERE id = r.requested_by_id)
        END)) as requester_name,
        COALESCE(r.assigned_to_name, (CASE 
          WHEN r.assigned_to_type = 'sub_admin' THEN (SELECT full_name FROM department_admins WHERE id = r.assigned_to_id)
          ELSE (SELECT full_name FROM employees WHERE id = r.assigned_to_id)
        END)) as assignee_name
      FROM stationary_refills r
      JOIN stationary_items si ON r.item_id = si.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    if (assigned_to_id && assigned_to_type) {
      query += ` AND r.assigned_to_id = $${paramIndex} AND r.assigned_to_type = $${paramIndex + 1}`;
      params.push(assigned_to_id, assigned_to_type);
    }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting refills:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.assignRefillTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      assigned_to_id, 
      assigned_to_type, 
      task_notes, 
      shop_name, 
      shop_address, 
      qty_to_buy,
      due_date,
      priority,
      assigner_type,
      assigner_id
    } = req.body;

    // Self-healing database check
    await pool.query(`
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS priority VARCHAR(50);
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS task_id INTEGER;
    `).catch(() => {});

    // Resolve refill item details
    const refillQuery = await pool.query(
      'SELECT i.name as item_name FROM stationary_refills r JOIN stationary_items i ON r.item_id = i.id WHERE r.id = $1',
      [id]
    );
    if (refillQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Refill request not found' });
    }
    const itemName = refillQuery.rows[0].item_name;

    let assName = '';
    let assRole = '';
    let assDept = '';

    if (assigned_to_type === 'sub_admin') {
      const adminRes = await pool.query(
        'SELECT da.full_name, d.name as department FROM department_admins da LEFT JOIN departments d ON da.department_id = d.id WHERE da.id = $1',
        [assigned_to_id]
      );
      if (adminRes.rows.length > 0) {
        assName = adminRes.rows[0].full_name;
        assRole = 'Sub Admin';
        assDept = adminRes.rows[0].department || '';
      }
    } else {
      const empRes = await pool.query(
        'SELECT full_name, role, department FROM employees WHERE id = $1',
        [assigned_to_id]
      );
      if (empRes.rows.length > 0) {
        assName = empRes.rows[0].full_name;
        assRole = empRes.rows[0].role || 'Employee';
        assDept = empRes.rows[0].department || '';
      }
    }

    // 1. Create a normal task in the tasks table
    const taskInsert = await pool.query(
      `INSERT INTO tasks 
      (title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date, priority, is_group_task, group_assignees, category) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        `Buy Stationary: ${itemName}`,
        `Please buy ${qty_to_buy} items of ${itemName} from vendor "${shop_name}" located at "${shop_address}". Notes: ${task_notes || ''}`,
        assigner_type || 'super_admin',
        assigner_id || 1,
        assigned_to_type === 'sub_admin' ? 'department_admin' : 'employee',
        assigned_to_id,
        assDept || 'Stationary',
        due_date || null,
        priority || 'Moderate',
        false,
        '[]',
        'Stationary'
      ]
    );
    const normalTaskId = taskInsert.rows[0].id;

    // 2. Update the stationary refills request
    const result = await pool.query(
      `UPDATE stationary_refills 
       SET assigned_to_id = $1, assigned_to_type = $2, assigned_to_name = $3, assigned_to_role = $4, assigned_to_dept = $5,
           task_notes = $6, shop_name = $7, shop_address = $8, qty_to_buy = $9, 
           due_date = $10, priority = $11, task_id = $12, status = 'Assigned', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $13 RETURNING *`,
      [
        assigned_to_id, 
        assigned_to_type, 
        assName, 
        assRole, 
        assDept, 
        task_notes, 
        shop_name, 
        shop_address, 
        qty_to_buy,
        due_date || null,
        priority || 'Moderate',
        normalTaskId,
        id
      ]
    );

    // 3. Create db notification
    const notificationMessage = `You have been assigned a new stationary refill task: "${itemName}".`;
    await pool.query(
      'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
      [
        assigned_to_type === 'sub_admin' ? 'department_admin' : 'employee', 
        assigned_to_id, 
        notificationMessage
      ]
    ).catch(e => console.error('Failed to write db notification:', e));

    // 4. Trigger push notification
    await notifyAssignee(
      assigned_to_type === 'sub_admin' ? 'department_admin' : 'employee',
      assigned_to_id,
      `Buy Stationary: ${itemName}`,
      assigner_type || 'super_admin',
      assigner_id || 1,
      normalTaskId
    ).catch(e => console.error('Failed to trigger push notification:', e));

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error assigning refill task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.completeRefillTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      bill_amount, 
      bill_image,
      is_new_vendor,
      new_vendor_name,
      new_vendor_address,
      qty_purchased,
      price_per_piece
    } = req.body;

    // Self-healing database check
    await pool.query(`
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS is_new_vendor BOOLEAN DEFAULT FALSE;
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS new_vendor_name VARCHAR(255);
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS new_vendor_address TEXT;
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS qty_purchased INTEGER;
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS price_per_piece NUMERIC(10,2);
    `).catch(() => {});

    // Update the refill task completion fields
    const result = await pool.query(
      `UPDATE stationary_refills 
       SET status = 'Completed', 
           bill_amount = $1, 
           bill_image = $2, 
           is_new_vendor = $3, 
           new_vendor_name = $4, 
           new_vendor_address = $5, 
           qty_purchased = $6, 
           price_per_piece = $7,
           completed_at = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [
        bill_amount || null, 
        bill_image || null, 
        is_new_vendor || false, 
        new_vendor_name || null, 
        new_vendor_address || null, 
        qty_purchased || null, 
        price_per_piece || null,
        id
      ]
    );

    // Update normal task status if linked
    if (result.rows.length > 0 && result.rows[0].task_id) {
      await pool.query(
        "UPDATE tasks SET status = 'Completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1", 
        [result.rows[0].task_id]
      ).catch(e => console.error('Failed to complete linked normal task:', e));
    }

    // Proactive vendor & pricing registration
    let finalVendorId = null;
    if (is_new_vendor && new_vendor_name) {
      // Create new predefined vendor
      const vendorInsert = await pool.query(
        'INSERT INTO stationary_vendors (name, address) VALUES ($1, $2) RETURNING id',
        [new_vendor_name, new_vendor_address || '']
      );
      if (vendorInsert.rows.length > 0) {
        finalVendorId = vendorInsert.rows[0].id;
      }
    } else if (result.rows.length > 0 && result.rows[0].shop_name) {
      // Find matching predefined vendor by name
      const vQuery = await pool.query('SELECT id FROM stationary_vendors WHERE name = $1', [result.rows[0].shop_name]);
      if (vQuery.rows.length > 0) {
        finalVendorId = vQuery.rows[0].id;
      }
    }

    if (finalVendorId && result.rows.length > 0) {
      const itemId = result.rows[0].item_id;
      const pPiece = price_per_piece || (bill_amount && qty_purchased ? (bill_amount / qty_purchased) : 0);
      
      await pool.query(
        `INSERT INTO stationary_vendor_products (vendor_id, item_id, price, package_qty) 
         VALUES ($1, $2, $3, 1) 
         ON CONFLICT (vendor_id, item_id) 
         DO UPDATE SET price = EXCLUDED.price, updated_at = CURRENT_TIMESTAMP`,
        [finalVendorId, itemId, pPiece]
      ).catch(e => console.error('Failed to update vendor product price:', e));
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error completing refill task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.fillupRefillStock = async (req, res) => {
  const { id } = req.params;
  const { quantity, approved_by_name, approved_by_role, approved_by_dept } = req.body;
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid quantity' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const refillRes = await client.query('SELECT item_id FROM stationary_refills WHERE id = $1', [id]);
    if (refillRes.rowCount === 0) {
      throw new Error('Refill request not found');
    }
    const itemId = refillRes.rows[0].item_id;

    // 1. Update refill status, qty, and approver details
    await client.query(
      `UPDATE stationary_refills 
       SET status = 'Filled', fillup_qty = $1, 
           approved_by_name = $2, approved_by_role = $3, approved_by_dept = $4,
           approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5`,
      [qty, approved_by_name || null, approved_by_role || null, approved_by_dept || null, id]
    );

    // 2. Increase stock of item
    await client.query(
      'UPDATE stationary_items SET stock = stock + $1 WHERE id = $2',
      [qty, itemId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Stock filled up successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in fillup:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

exports.rejectRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejected_by_name, rejected_by_role, rejected_by_dept } = req.body;
    
    // Self-healing database check
    await pool.query(`
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS rejected_by_name VARCHAR(255);
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS rejected_by_role VARCHAR(100);
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS rejected_by_dept VARCHAR(100);
      ALTER TABLE stationary_refills ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
    `).catch(() => {});

    const result = await pool.query(
      `UPDATE stationary_refills 
       SET status = 'Rejected', 
           rejected_by_name = $1, rejected_by_role = $2, rejected_by_dept = $3,
           rejected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [rejected_by_name || null, rejected_by_role || null, rejected_by_dept || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Refill request not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting refill request:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendorsRes = await pool.query('SELECT * FROM stationary_vendors ORDER BY name ASC');
    const productsRes = await pool.query(`
      SELECT vp.*, i.name as item_name 
      FROM stationary_vendor_products vp
      JOIN stationary_items i ON vp.item_id = i.id
    `);
    
    const productsByVendor = {};
    productsRes.rows.forEach(p => {
      if (!productsByVendor[p.vendor_id]) productsByVendor[p.vendor_id] = [];
      productsByVendor[p.vendor_id].push({
        item_id: p.item_id,
        item_name: p.item_name,
        price: parseFloat(p.price),
        package_qty: p.package_qty
      });
    });

    const vendors = vendorsRes.rows.map(v => ({
      ...v,
      products: productsByVendor[v.id] || []
    }));

    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addVendor = async (req, res) => {
  try {
    const { name, address, products } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Vendor name is required' });
    
    const result = await pool.query(
      'INSERT INTO stationary_vendors (name, address) VALUES ($1, $2) RETURNING *',
      [name, address]
    );
    const vendor = result.rows[0];

    if (products && Array.isArray(products)) {
      for (const p of products) {
        await pool.query(
          `INSERT INTO stationary_vendor_products (vendor_id, item_id, price, package_qty) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (vendor_id, item_id) 
           DO UPDATE SET price = EXCLUDED.price, package_qty = EXCLUDED.package_qty`,
          [vendor.id, p.item_id, p.price || 0, p.package_qty || 1]
        );
      }
    }

    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Error adding vendor:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, products } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Vendor name is required' });

    await pool.query(
      'UPDATE stationary_vendors SET name = $1, address = $2 WHERE id = $3',
      [name, address, id]
    );

    // Delete old mappings
    await pool.query('DELETE FROM stationary_vendor_products WHERE vendor_id = $1', [id]);

    // Insert new mappings
    if (products && Array.isArray(products)) {
      for (const p of products) {
        await pool.query(
          `INSERT INTO stationary_vendor_products (vendor_id, item_id, price, package_qty) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (vendor_id, item_id) 
           DO UPDATE SET price = EXCLUDED.price, package_qty = EXCLUDED.package_qty`,
          [id, p.item_id, p.price || 0, p.package_qty || 1]
        );
      }
    }

    res.json({ success: true, message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM stationary_vendors WHERE id = $1', [id]);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

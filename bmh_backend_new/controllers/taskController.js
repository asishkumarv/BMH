const pool = require('../db');

// Helper to create a notification
const createNotification = async (userType, userId, message) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_type, user_id, message) VALUES ($1, $2, $3)',
      [userType, userId, message]
    );
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks 
      (title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date || null]
    );

    const task = result.rows[0];

    // Create notification for assignee
    await createNotification(assignee_type, assignee_id, `You have been assigned a new task: "${title}" by a ${assigner_type.replace('_', ' ')}.`);

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Server error creating task' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { user_type, user_id, department } = req.query;

    const fields = `
      t.*, 
      (CASE 
        WHEN t.assigner_type = 'super_admin' THEN (SELECT full_name FROM super_admins WHERE id = t.assigner_id)
        WHEN t.assigner_type = 'department_admin' THEN (SELECT full_name FROM department_admins WHERE id = t.assigner_id)
        WHEN t.assigner_type = 'employee' THEN (SELECT full_name FROM employees WHERE id = t.assigner_id)
      END) as assigner_name,
      (CASE 
        WHEN t.assignee_type = 'super_admin' THEN (SELECT full_name FROM super_admins WHERE id = t.assignee_id)
        WHEN t.assignee_type = 'department_admin' THEN (SELECT full_name FROM department_admins WHERE id = t.assignee_id)
        WHEN t.assignee_type = 'employee' THEN (SELECT full_name FROM employees WHERE id = t.assignee_id)
      END) as assignee_name
    `;

    let query = `SELECT ${fields} FROM tasks t ORDER BY t.created_at DESC`;
    let params = [];

    // Filtering logic based on requester role
    if (user_type === 'super_admin') {
      // Super admin sees all tasks. Query is already select all.
    } else if (user_type === 'department_admin') {
      // Sub admin sees tasks assigned TO them, BY them, OR in their department
      query = `SELECT ${fields} FROM tasks t 
               WHERE (t.assignee_type = 'department_admin' AND t.assignee_id = $1) 
                  OR (t.assigner_type = 'department_admin' AND t.assigner_id = $1)
                  OR t.department = $2
               ORDER BY t.created_at DESC`;
      params = [user_id, department];
    } else if (user_type === 'employee') {
      // Employee sees tasks assigned TO them OR BY them
      query = `SELECT ${fields} FROM tasks t 
               WHERE (t.assignee_type = 'employee' AND t.assignee_id = $1) 
                  OR (t.assigner_type = 'employee' AND t.assigner_id = $1)
               ORDER BY t.created_at DESC`;
      params = [user_id];
    }

    const result = await pool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Server error fetching tasks' });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, notes, updater_type, updater_id } = req.body;

    // Fetch existing task to know who to notify
    const existingTaskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const task = existingTaskResult.rows[0];

    const result = await pool.query(
      `UPDATE tasks 
       SET status = $1, rejection_reason = $2, notes = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [
        status || task.status,
        rejection_reason !== undefined ? rejection_reason : task.rejection_reason,
        notes !== undefined ? notes : task.notes,
        id
      ]
    );

    const updatedTask = result.rows[0];

    // Notification logic
    const updaterString = updater_type ? updater_type.replace('_', ' ') : 'someone';
    
    if (status === 'rejected') {
      // Notify assigner
      await createNotification(task.assigner_type, task.assigner_id, `Task "${task.title}" was REJECTED by assignee. Reason: ${rejection_reason}`);
      // Notify super admins broadly (in a real app we'd fetch super admin IDs, here we might broadcast or just notify assigner if assigner is super admin)
      if (task.assigner_type !== 'super_admin') {
         // Optionally, notify all super admins. Let's assume user_id=1 is a main super admin, or we add a role 'super_admin' without id for global things?
         // We will just notify the assigner for now. If a sub-admin assigned it, the sub admin knows.
      }
    } else if (status === 'completed' || status === 'terminated') {
      await createNotification(task.assigner_type, task.assigner_id, `Task "${task.title}" was marked as ${status.toUpperCase()} by the assignee.`);
    }

    res.json({ success: true, message: 'Task updated', data: updatedTask });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ success: false, message: 'Server error updating task status' });
  }
};

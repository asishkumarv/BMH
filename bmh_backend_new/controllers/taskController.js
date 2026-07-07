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
    const { title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date, priority } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks 
      (title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date, priority) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, description, assigner_type, assigner_id, assignee_type, assignee_id, department, due_date || null, priority || 'Moderate']
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
    // Run schema migrations for duration metrics tracking
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);

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

    let result;
    if (status === 'accepted') {
      result = await pool.query(
        `UPDATE tasks 
         SET status = $1, rejection_reason = $2, notes = $3, accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 RETURNING *`,
        [
          status || task.status,
          rejection_reason !== undefined ? rejection_reason : task.rejection_reason,
          notes !== undefined ? notes : task.notes,
          id
        ]
      );
    } else if (status === 'completed') {
      result = await pool.query(
        `UPDATE tasks 
         SET status = $1, rejection_reason = $2, notes = $3, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4 RETURNING *`,
        [
          status || task.status,
          rejection_reason !== undefined ? rejection_reason : task.rejection_reason,
          notes !== undefined ? notes : task.notes,
          id
        ]
      );
    } else {
      result = await pool.query(
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
    }

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

exports.reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignee_type, assignee_id, department } = req.body;

    if (!assignee_id || !assignee_type) {
      return res.status(400).json({ success: false, message: 'assignee_id and assignee_type are required' });
    }

    const existingResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const task = existingResult.rows[0];

    const result = await pool.query(
      `UPDATE tasks
       SET assignee_type = $1, assignee_id = $2, department = COALESCE($3, department),
           status = 'assigned', rejection_reason = NULL, notes = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [assignee_type, assignee_id, department || null, id]
    );

    const updated = result.rows[0];

    // Notify new assignee
    await createNotification(
      assignee_type,
      assignee_id,
      `You have been assigned a task: "${task.title}" by a ${task.assigner_type.replace('_', ' ')}.`
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({ success: false, message: 'Server error reassigning task' });
  }
};

exports.createRecurringTask = async (req, res) => {
  try {
    const { title, description, department, assigner_type, assigner_id, assignee_type, assignee_id, priority, frequency, specific_days } = req.body;
    
    if (!title || !assignee_id || !frequency) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const query = 'INSERT INTO recurring_tasks (title, description, department, assigner_type, assigner_id, assignee_type, assignee_id, priority, frequency, specific_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *';
    const values = [
      title, description, department, assigner_type, assigner_id,
      assignee_type, assignee_id, priority || 'Medium', frequency,
      specific_days ? JSON.stringify(specific_days) : null
    ];
    const result = await pool.query(query, values);
    const rTask = result.rows[0];
    
    // Trigger immediate generation if due today
    try {
        const today = new Date();
        const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
        const currentDateOfMonth = today.getDate();
        
        let shouldGenerate = false;
        if (rTask.frequency === 'daily') {
            shouldGenerate = true;
        } else if (rTask.frequency === 'weekly') {
            let days = rTask.specific_days || [];
            if (typeof days === 'string') {
                try { days = JSON.parse(days); } catch(e) { days = []; }
            }
            if (days.includes(currentDayOfWeek) || days.includes(currentDayOfWeek.toString())) {
                shouldGenerate = true;
            }
        } else if (rTask.frequency === 'monthly') {
            let dates = rTask.specific_days || [];
            if (typeof dates === 'string') {
                try { dates = JSON.parse(dates); } catch(e) { dates = []; }
            }
            for (let d of dates) {
                if (typeof d === 'string' && d.includes('-')) {
                    const parts = d.split('-');
                    if (parts.length === 2) {
                        const start = parseInt(parts[0]);
                        const end = parseInt(parts[1]);
                        if (currentDateOfMonth >= start && currentDateOfMonth <= end) {
                            shouldGenerate = true;
                            break;
                        }
                    }
                } else {
                    if (d == currentDateOfMonth) {
                        shouldGenerate = true;
                        break;
                    }
                }
            }
        }

        if (shouldGenerate) {
            const dueAt = new Date(today);
            dueAt.setHours(23, 59, 59, 999);
            const insertTask = `
                INSERT INTO tasks (
                    title, description, department, assigner_type, assigner_id, 
                    assignee_type, assignee_id, priority, due_date, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'assigned')
            `;
            const tValues = [
                rTask.title, rTask.description, rTask.department, rTask.assigner_type, rTask.assigner_id,
                rTask.assignee_type, rTask.assignee_id, rTask.priority, dueAt.toISOString()
            ];
            await pool.query(insertTask, tValues);
            await pool.query(`UPDATE recurring_tasks SET last_generated_at = CURRENT_TIMESTAMP WHERE id = $1`, [rTask.id]);
        }
    } catch (genErr) {
        console.error('Error generating initial task for recurring schedule:', genErr);
    }
    
    res.status(201).json({ success: true, data: rTask, message: 'Recurring task created successfully' });
  } catch (err) {
    console.error('Error creating recurring task:', err);
    res.status(500).json({ success: false, message: 'Failed to create recurring task' });
  }
};

exports.getRecurringTasks = async (req, res) => {
  try {
    const { user_type, user_id, department } = req.query;

    const createTableQuery = `CREATE TABLE IF NOT EXISTS recurring_tasks (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, department VARCHAR(255), assigner_type VARCHAR(50) NOT NULL, assigner_id INTEGER NOT NULL, assignee_type VARCHAR(50) NOT NULL, assignee_id INTEGER NOT NULL, priority VARCHAR(50) DEFAULT 'Medium', frequency VARCHAR(50) NOT NULL, specific_days JSONB, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_generated_at TIMESTAMP);`;
    await pool.query(createTableQuery);
    
    let query = 'SELECT r.*, emp.full_name as assignee_name, emp.profile_data as assignee_profile FROM recurring_tasks r LEFT JOIN employees emp ON r.assignee_id = emp.id AND r.assignee_type = \'employee\' ORDER BY r.created_at DESC';
       
    if (user_type === 'department_admin') {
       query = 'SELECT r.*, emp.full_name as assignee_name, emp.profile_data as assignee_profile FROM recurring_tasks r LEFT JOIN employees emp ON r.assignee_id = emp.id AND r.assignee_type = \'employee\' WHERE r.department = \'' + department + '\' OR r.assigner_id = ' + user_id + ' ORDER BY r.created_at DESC';
    }

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching recurring tasks:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recurring tasks' });
  }
};

exports.updateRecurringTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const query = 'UPDATE recurring_tasks SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Recurring task not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Recurring task status updated' });
  } catch (err) {
    console.error('Error updating recurring task:', err);
    res.status(500).json({ success: false, message: 'Failed to update recurring task' });
  }
};
exports.deleteRecurringTask = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recurring_tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Recurring task not found' });
    }
    res.json({ success: true, message: 'Recurring task deleted successfully' });
  } catch (err) {
    console.error('Error deleting recurring task:', err);
    res.status(500).json({ success: false, message: 'Failed to delete recurring task' });
  }
};


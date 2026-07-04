const fs = require('fs');
const content = `
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
    
    res.status(201).json({ success: true, data: result.rows[0], message: 'Recurring task created successfully' });
  } catch (err) {
    console.error('Error creating recurring task:', err);
    res.status(500).json({ success: false, message: 'Failed to create recurring task' });
  }
};

exports.getRecurringTasks = async (req, res) => {
  try {
    const { role, id, department } = req.user;
    
    let query = 'SELECT r.*, emp.full_name as assignee_name, emp.profile_data as assignee_profile FROM recurring_tasks r LEFT JOIN employees emp ON r.assignee_id = emp.id AND r.assignee_type = \\'employee\\' ORDER BY r.created_at DESC';
       
    if (role === 'Sub Admin') {
       query = 'SELECT r.*, emp.full_name as assignee_name, emp.profile_data as assignee_profile FROM recurring_tasks r LEFT JOIN employees emp ON r.assignee_id = emp.id AND r.assignee_type = \\'employee\\' WHERE r.department = \\'' + department + '\\' OR r.assigner_id = ' + id + ' ORDER BY r.created_at DESC';
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
`;

fs.appendFileSync('controllers/taskController.js', content);
console.log('Appended to taskController.js');

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.put('/:id/status', taskController.updateTaskStatus);

// Recurring tasks
router.post('/recurring', taskController.createRecurringTask);
router.get('/recurring', taskController.getRecurringTasks);
router.put('/recurring/:id/status', taskController.updateRecurringTaskStatus);
router.delete('/recurring/:id', taskController.deleteRecurringTask);

router.get('/create-recurring-table', async (req, res) => {
  try {
    const pool = require('../db');
    const query = `CREATE TABLE IF NOT EXISTS recurring_tasks (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, department VARCHAR(255), assigner_type VARCHAR(50) NOT NULL, assigner_id INTEGER NOT NULL, assignee_type VARCHAR(50) NOT NULL, assignee_id INTEGER NOT NULL, priority VARCHAR(50) DEFAULT 'Medium', frequency VARCHAR(50) NOT NULL, specific_days JSONB, status VARCHAR(50) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, last_generated_at TIMESTAMP);`;
    await pool.query(query);
    res.json({ success: true, message: 'Table created' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

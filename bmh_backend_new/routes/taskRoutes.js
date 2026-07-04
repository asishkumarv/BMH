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

module.exports = router;

const express = require('express');
const router = express.Router();
const inventoryCheckerController = require('../controllers/inventoryCheckerController');

router.post('/assign', inventoryCheckerController.assignTasks);
router.get('/tasks', inventoryCheckerController.getTasks);
router.post('/verification', inventoryCheckerController.submitVerification);
router.get('/verifications', inventoryCheckerController.getVerifications);
router.put('/verification/:id/review', inventoryCheckerController.reviewVerification);
router.put('/task/:id/status', inventoryCheckerController.updateTaskStatus);
router.post('/send-reorganization', inventoryCheckerController.sendReorganization);

module.exports = router;

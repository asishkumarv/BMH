const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');

router.get('/patients', crmController.getPatients);
router.get('/filters', crmController.getFilterOptions);
router.post('/send-message', crmController.sendMessage);
router.get('/history', crmController.getHistory);
router.get('/templates', crmController.getTemplates);
router.post('/templates', crmController.createTemplate);
router.delete('/templates/:name', crmController.deleteTemplate);

module.exports = router;

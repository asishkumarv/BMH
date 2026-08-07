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
router.post('/voice-call', crmController.initiateVoiceCall);
router.post('/webhook', crmController.handleDoubleTickWebhook);
router.post('/trigger-refill-reminders', crmController.triggerRefillReminders);
router.get('/reorders', crmController.getReorders);
router.put('/reorders/:id/status', crmController.updateReorderStatus);

module.exports = router;

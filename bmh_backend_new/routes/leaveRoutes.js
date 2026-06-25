const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

// Settings
router.get('/settings', leaveController.getSettings);
router.post('/settings/department', leaveController.updateDepartmentSettings);
router.post('/settings/role', leaveController.updateRoleSettings);

// Requests
router.post('/request', leaveController.applyLeave);
router.get('/requests', leaveController.getRequests);
router.put('/request/:id/status', leaveController.updateRequestStatus);

// Summary
router.get('/summary/:employee_id', leaveController.getEmployeeLeaveSummary);

// Payslips
router.post('/payslip/generate', leaveController.generatePayslip);
router.get('/payslips', leaveController.getPayslips);

module.exports = router;

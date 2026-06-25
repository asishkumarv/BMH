const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const analyticsController = require('../controllers/attendanceAnalyticsController');

// Actions
router.post('/verify-location', attendanceController.verifyLocation);
router.post('/verify-face', attendanceController.verifyFaceAndMarkAttendance);
router.post('/break', attendanceController.markBreak);

// Analytics
router.get('/summary', analyticsController.getAttendanceSummary);
router.get('/reports', analyticsController.getAdvancedReports);
router.get('/employee-analytics', analyticsController.getEmployeeAnalytics);
router.get('/employee-dashboard/:employeeId', attendanceController.getEmployeeDashboardStatus);
router.get('/today/:employeeId', attendanceController.checkTodayAttendance);

module.exports = router;

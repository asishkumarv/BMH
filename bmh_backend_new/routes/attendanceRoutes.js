const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const analyticsController = require('../controllers/attendanceAnalyticsController');

// Actions
router.post('/quick-attendance', attendanceController.quickAttendance);
router.post('/verify-location', attendanceController.verifyLocation);
router.post('/verify-face', attendanceController.verifyFaceAndMarkAttendance);
router.post('/break', attendanceController.markBreak);

// Analytics
router.get('/summary', analyticsController.getAttendanceSummary);
router.get('/reports', analyticsController.getAdvancedReports);
router.get('/employee-analytics', analyticsController.getEmployeeAnalytics);
router.get('/employee-dashboard/:employeeId', attendanceController.getEmployeeDashboardStatus);
router.get('/today/:employeeId', attendanceController.checkTodayAttendance);

router.put('/admin-update/:id', attendanceController.adminUpdateAttendance);
router.post('/admin-create', attendanceController.adminCreateAttendance);
router.get('/image/:id/:type', attendanceController.getAttendanceImage);
router.get('/profile-image/:id/:userType', attendanceController.getProfileImage);

module.exports = router;

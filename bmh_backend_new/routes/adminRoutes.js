const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/super-admins', adminController.registerSuperAdmin);
router.post('/super-admins/login', adminController.loginSuperAdmin);
router.get('/department-admins', adminController.getAdmins);
router.post('/department-admins', adminController.addAdmin);
router.post('/department-admins/login', adminController.loginAdmin);
router.post('/super-admins/login', adminController.loginSuperAdmin);
router.get('/department-admins/:department_id/metrics', adminController.getDepartmentMetrics);
router.put('/department-admins/:id/status', adminController.updateAdminStatus);
router.put('/super-admins/:id/password', adminController.updateSuperAdminPassword);
router.put('/department-admins/:id/password', adminController.updateDepartmentAdminPassword);

module.exports = router;

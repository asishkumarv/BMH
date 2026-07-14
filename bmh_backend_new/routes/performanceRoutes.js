const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');

router.get('/admin-stats', performanceController.getAdminPerformanceStats);
router.get('/rider-stats/:riderId', performanceController.getDeliveryBoyPerformanceStats);
router.get('/employee-stats/:employeeId', performanceController.getEmployeeIndividualPerformanceStats);
router.post('/appraisal/:employeeId', performanceController.saveEmployeeAppraisal);

module.exports = router;

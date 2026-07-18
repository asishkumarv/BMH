const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /employees/all-users
router.get('/all-users', employeeController.getAllUsers);

// GET /employees
router.get('/', employeeController.getAllEmployees);

// POST /employees
router.post('/', employeeController.addEmployee);

// POST /employees/login
router.post('/login', employeeController.loginEmployee);

// POST /employees/update-push-token
router.post('/update-push-token', employeeController.updatePushToken);

// GET /employees/by-department-id/:dept_id
router.get('/by-department-id/:dept_id', employeeController.getEmployeesByDepartment);

// PUT /employees/:id/status
router.put('/:id/status', employeeController.updateEmployeeStatus);

// PUT /employees/:id/po-access
router.put('/:id/po-access', employeeController.updatePOAccess);

// POST /employees/purchase-orders/bulk-save
router.post('/purchase-orders/bulk-save', employeeController.bulkSavePurchaseOrders);


// GET /employees/delivery-fleet
router.get('/delivery-fleet', employeeController.getDeliveryFleet);

// GET /employees/store-delivery-fleet
router.get('/store-delivery-fleet', employeeController.getStoreDeliveryFleet);

// GET /employees/store-delivery/assigned
router.get('/store-delivery/assigned', employeeController.getStoreDeliveryAssignedOrders);

// PUT /employees/:id/location
router.put('/:id/location', employeeController.updateEmployeeLocation);

// GET /employees/:id/assigned-orders
router.get('/:id/assigned-orders', employeeController.getAssignedOrders);

// PUT /employees/:id/password
router.put('/:id/password', employeeController.updateEmployeePassword);

// PUT /employees/:id/profile
router.put('/:id/profile', employeeController.updateEmployeeProfile);

// GET /employees/peers/:id
router.get('/peers/:id', employeeController.getDepartmentPeers);

module.exports = router;

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /employees
router.get('/', employeeController.getAllEmployees);

// POST /employees
router.post('/', employeeController.addEmployee);

// POST /employees/login
router.post('/login', employeeController.loginEmployee);

// GET /employees/by-department-id/:dept_id
router.get('/by-department-id/:dept_id', employeeController.getEmployeesByDepartment);

// PUT /employees/:id/status
router.put('/:id/status', employeeController.updateEmployeeStatus);

// PUT /employees/:id/password
router.put('/:id/password', employeeController.updateEmployeePassword);

// PUT /employees/:id/profile
router.put('/:id/profile', employeeController.updateEmployeeProfile);

module.exports = router;

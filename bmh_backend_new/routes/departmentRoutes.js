const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.addDepartment);
router.post('/location', departmentController.updateLocation);

module.exports = router;
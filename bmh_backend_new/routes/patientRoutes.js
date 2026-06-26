const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');

router.post('/register', patientController.register);
router.post('/login', patientController.login);
router.post('/forgot-password', patientController.forgotPassword);
router.get('/profile/:id', patientController.getProfile);
router.put('/profile/:id', patientController.updateProfile);
router.get('/by-mobile/:mobile', patientController.getPatientByMobile);

module.exports = router;

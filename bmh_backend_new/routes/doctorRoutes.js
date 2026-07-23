const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

router.post('/register', doctorController.registerDoctor);
router.post('/login', doctorController.loginDoctor);
router.post('/create', doctorController.createDoctor);
router.get('/', doctorController.getDoctors);
router.put('/:id', doctorController.updateDoctor);
router.put('/:id/status', doctorController.updateDoctorStatus);
router.put('/:id/approve', doctorController.approveDoctor);
router.post('/slots', doctorController.createSlot);
router.get('/slots', doctorController.getSlots);
router.get('/peons', doctorController.getAvailablePeons);
router.put('/slots/:id/peon', doctorController.assignPeonToSlot);
router.put('/slots/:id', doctorController.updateSlot);
router.post('/consultation', doctorController.saveConsultation);
router.put('/consultation/:id', doctorController.updateConsultation);
router.get('/:id/patients', doctorController.getDoctorPatients);
router.get('/patient-history', doctorController.getAllPatientHistory);

module.exports = router;

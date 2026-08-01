const express = require('express');
const router = express.Router();
const rackCheckerController = require('../controllers/rackCheckerController');

router.get('/racks', rackCheckerController.getRacksList);
router.get('/rack-medicines/:rack', rackCheckerController.getRackMedicines);
router.post('/assign', rackCheckerController.assignRacks);
router.get('/assignments', rackCheckerController.getAssignments);
router.put('/assignment/:id/status', rackCheckerController.updateAssignmentStatus);
router.post('/discrepancy', rackCheckerController.submitDiscrepancy);
router.get('/discrepancies', rackCheckerController.getDiscrepancies);
router.put('/discrepancy/:id/review', rackCheckerController.reviewDiscrepancy);

module.exports = router;

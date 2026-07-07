const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

router.get('/', busController.getBuses);
router.post('/', busController.addBus);
router.put('/:id', busController.updateBus);

module.exports = router;

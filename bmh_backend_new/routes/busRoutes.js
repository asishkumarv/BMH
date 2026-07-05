const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');

router.get('/', busController.getBuses);
router.post('/', busController.addBus);

module.exports = router;

const express = require('express');
const router = express.Router();
const manualOrderController = require('../controllers/manualOrderController');

router.post('/', manualOrderController.createOrder);
router.get('/', manualOrderController.getOrders);
router.put('/:id', manualOrderController.updateOrder);

module.exports = router;

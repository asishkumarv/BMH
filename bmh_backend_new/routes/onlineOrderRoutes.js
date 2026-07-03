const express = require('express');
const router = express.Router();
const onlineOrderController = require('../controllers/onlineOrderController');

router.post('/create', onlineOrderController.createOrder);
router.get('/', onlineOrderController.getOrders);
router.put('/:id/status', onlineOrderController.updateOrderStatus);

module.exports = router;

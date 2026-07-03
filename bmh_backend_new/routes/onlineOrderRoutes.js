const express = require('express');
const router = express.Router();
const onlineOrderController = require('../controllers/onlineOrderController');

router.post('/create', onlineOrderController.createOrder);
router.get('/', onlineOrderController.getOrders);
router.put('/:id/status', onlineOrderController.updateOrderStatus);
router.get('/patient/:patient_id', onlineOrderController.getOrdersByPatient);

module.exports = router;

const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');

router.get('/dashboard', pharmacyController.getDashboard);
router.post('/manual-fetch', pharmacyController.manualFetch);
router.post('/generate-token', pharmacyController.generateToken);
router.post('/create-order', pharmacyController.createOrder);
router.post('/items', pharmacyController.getItems);
router.post('/stock', pharmacyController.getStock);
router.post('/customers', pharmacyController.getCustomers);
router.post('/purchase-order', pharmacyController.getPurchaseOrder);
router.get('/order-status', pharmacyController.getOrderStatus);
router.get('/webhooks', pharmacyController.getWebhooks);

module.exports = router;

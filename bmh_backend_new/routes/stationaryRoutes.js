const express = require('express');
const router = express.Router();
const stationaryController = require('../controllers/stationaryController');

// Inventory
router.get('/items', stationaryController.getItems);
router.post('/items', stationaryController.addItem);
router.post('/items/bulk', stationaryController.addBulkItems);
router.put('/items/:id/stock', stationaryController.updateItemStock);
router.put('/items/:id', stationaryController.updateItem);
router.delete('/items/:id', stationaryController.deleteItem);

// Requests
router.get('/requests', stationaryController.getRequests);
router.post('/requests', stationaryController.createRequest);
router.put('/requests/:id/approve', stationaryController.approveRequest);

module.exports = router;

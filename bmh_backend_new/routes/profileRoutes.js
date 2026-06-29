const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.post('/request-update', profileController.requestProfileUpdate);
router.get('/pending-requests', profileController.getPendingRequests);
router.get('/my-requests/:user_type/:user_id', profileController.getMyRequests);
router.put('/review-request/:id', profileController.reviewProfileUpdate);

module.exports = router;

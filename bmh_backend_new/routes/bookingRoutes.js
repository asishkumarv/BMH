const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/create', bookingController.createBooking);
router.post('/block-token', bookingController.blockToken);
router.get('/', bookingController.getBookings);
router.put('/:id/status', bookingController.updateBookingStatus);
router.get('/revenue', bookingController.getRevenue);

router.put('/:id/print-count', bookingController.incrementPrintCount);
router.put('/:id/reschedule', bookingController.rescheduleBooking);

module.exports = router;

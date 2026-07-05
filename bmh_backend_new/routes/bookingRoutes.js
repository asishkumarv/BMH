const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/create', bookingController.createBooking);
router.post('/block-token', bookingController.blockToken);
router.get('/', bookingController.getBookings);
router.put('/:id/status', bookingController.updateBookingStatus);
router.get('/revenue', bookingController.getRevenue);

router.get('/cancelled-list', bookingController.getCancelledBookings);
router.put('/:id/print-count', bookingController.incrementPrintCount);
router.put('/bulk/reschedule', bookingController.bulkRescheduleSlot);
router.put('/:id/reschedule', bookingController.rescheduleBooking);

router.put('/:id', bookingController.editBooking);
router.post('/:id/cancel', bookingController.cancelBooking);
router.put('/cancelled/:id/refund', bookingController.processRefund);

module.exports = router;

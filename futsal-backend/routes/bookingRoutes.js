const express = require('express');
const { body } = require('express-validator');
const { createBooking, getBookings, getBooking, getAvailableSlots, cancelBooking } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

router.get('/slots/:courtId', getAvailableSlots);

router.post(
  '/',
  protect,
  authorize('customer'),
  [
    body('courtId').notEmpty().withMessage('Court ID is required'),
    body('bookingDate').isISO8601().withMessage('Valid booking date is required'),
    body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('Valid start time (HH:MM) required'),
    body('endTime').matches(/^\d{2}:\d{2}$/).withMessage('Valid end time (HH:MM) required'),
  ],
  validate,
  createBooking
);

router.get('/', protect, getBookings);
router.get('/:id', protect, getBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;

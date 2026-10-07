const express = require('express');
const { body } = require('express-validator');
const {
  createBooking,
  getBookings,
  getBooking,
  getAvailableSlots,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

router.get('/slots/:courtId', getAvailableSlots);

router.post(
  '/',
  protect,
  authorize('customer'),
  [
    body('courtId').isMongoId().withMessage('Valid Court ID is required'),
    body('bookingDate').isISO8601().withMessage('Valid booking date is required (YYYY-MM-DD)'),
    body('startTime')
      .matches(TIME_REGEX)
      .withMessage('Valid start time (HH:MM 00:00-23:59) is required'),
    body('endTime')
      .matches(TIME_REGEX)
      .withMessage('Valid end time (HH:MM 00:00-23:59) is required'),
  ],
  validate,
  createBooking
);

router.get('/', protect, getBookings);
router.get('/:id', protect, getBooking);
router.delete('/:id', protect, cancelBooking);

module.exports = router;

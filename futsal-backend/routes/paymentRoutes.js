const express = require('express');
const { initiatePayment, verifyPayment, getPaymentHistory, initiateRefund } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/initiate', protect, authorize('customer'), initiatePayment);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);
router.post('/refund/:bookingId', protect, authorize('owner', 'admin'), initiateRefund);

module.exports = router;

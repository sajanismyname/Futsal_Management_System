const axios = require('axios');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Court = require('../models/Court');
const User = require('../models/User');
const {
  sendEmail,
  createInAppNotification,
  bookingConfirmedEmail,
  paymentReceiptEmail,
} = require('../services/notificationService');

// @desc    Initiate payment
// @route   POST /api/v1/payment/initiate
// @access  Private (Customer)
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    const booking = await Booking.findById(bookingId).populate('courtId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'confirmed' || booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking is already paid' });
    }

    if (booking.status === 'cancelled' || booking.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled/expired booking' });
    }

    // Mock payment mode for dev/test
    if (process.env.MOCK_PAYMENT === 'true') {
      const payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        transactionId: `MOCK-${Date.now()}`,
        amount: booking.totalAmount,
        paymentMethod: 'mock',
        status: 'initiated',
      });

      return res.json({
        success: true,
        paymentMethod: 'mock',
        mockVerifyUrl: `/api/v1/payment/verify`,
        paymentId: payment._id,
        amount: booking.totalAmount,
        message: 'Mock payment initiated. Use verify endpoint with paymentId to confirm.',
      });
    }

    if (paymentMethod === 'khalti') {
      const khaltiRes = await axios.post(
        `${process.env.KHALTI_BASE_URL}/epayment/initiate/`,
        {
          return_url: `${process.env.FRONTEND_URL}/payment/verify`,
          website_url: process.env.FRONTEND_URL,
          amount: booking.totalAmount * 100, // in paisa
          purchase_order_id: booking._id.toString(),
          purchase_order_name: `Futsal Booking - ${booking.courtId.courtName}`,
          customer_info: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone || '9800000000',
          },
        },
        {
          headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` },
        }
      );

      const payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        pidx: khaltiRes.data.pidx,
        amount: booking.totalAmount,
        paymentMethod: 'khalti',
        status: 'initiated',
        gatewayResponse: khaltiRes.data,
      });

      return res.json({
        success: true,
        paymentUrl: khaltiRes.data.payment_url,
        pidx: khaltiRes.data.pidx,
        paymentId: payment._id,
      });
    }

    if (paymentMethod === 'esewa') {
      const payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        transactionId: `ESEWA-${booking._id}-${Date.now()}`,
        amount: booking.totalAmount,
        paymentMethod: 'esewa',
        status: 'initiated',
      });

      return res.json({
        success: true,
        paymentMethod: 'esewa',
        esewaConfig: {
          amt: booking.totalAmount,
          psc: 0,
          pdc: 0,
          txAmt: 0,
          tAmt: booking.totalAmount,
          pid: payment.transactionId,
          scd: process.env.ESEWA_MERCHANT_CODE,
          su: `${process.env.FRONTEND_URL}/payment/verify?method=esewa&paymentId=${payment._id}`,
          fu: `${process.env.FRONTEND_URL}/payment/failure`,
        },
        esewaUrl: `${process.env.ESEWA_BASE_URL}/api/epay/main/v2/form`,
        paymentId: payment._id,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment
// @route   POST /api/v1/payment/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const { pidx, paymentId, method } = req.body;

    const payment = await Payment.findById(paymentId).populate('bookingId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    if (payment.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payment already verified' });
    }

    const booking = await Booking.findById(payment.bookingId).populate('courtId');

    // Mock payment verification
    if (payment.paymentMethod === 'mock') {
      payment.status = 'completed';
      payment.transactionId = `MOCK-VERIFIED-${Date.now()}`;
      await payment.save();

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      const user = await User.findById(payment.userId);
      if (user && user.emailNotifications) {
        await sendEmail(bookingConfirmedEmail(user, booking, booking.courtId));
        await sendEmail(paymentReceiptEmail(user, payment, booking, booking.courtId));
      }

      await createInAppNotification({
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Payment of NPR ${payment.amount} confirmed for ${booking.courtId.courtName}.`,
        type: 'payment_success',
        relatedId: payment._id,
        relatedModel: 'Payment',
      });

      return res.json({ success: true, message: 'Payment verified (mock)', booking, payment });
    }

    // Khalti verification
    if (payment.paymentMethod === 'khalti') {
      const khaltiVerify = await axios.post(
        `${process.env.KHALTI_BASE_URL}/epayment/lookup/`,
        { pidx },
        { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
      );

      if (khaltiVerify.data.status !== 'Completed') {
        payment.status = 'failed';
        await payment.save();
        return res.status(400).json({ success: false, message: 'Khalti payment not completed', data: khaltiVerify.data });
      }

      payment.status = 'completed';
      payment.transactionId = khaltiVerify.data.transaction_id;
      payment.gatewayResponse = khaltiVerify.data;
      await payment.save();

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      const user = await User.findById(payment.userId);
      if (user && user.emailNotifications) {
        await sendEmail(bookingConfirmedEmail(user, booking, booking.courtId));
      }

      return res.json({ success: true, message: 'Khalti payment verified', booking, payment });
    }

    // eSewa verification
    if (payment.paymentMethod === 'esewa') {
      const { refId } = req.body;
      const esewaVerify = await axios.post(`${process.env.ESEWA_BASE_URL}/api/epay/transaction/status/`, {
        product_code: process.env.ESEWA_MERCHANT_CODE,
        total_amount: payment.amount,
        transaction_uuid: payment.transactionId,
      });

      if (esewaVerify.data.status !== 'COMPLETE') {
        return res.status(400).json({ success: false, message: 'eSewa payment not completed' });
      }

      payment.status = 'completed';
      payment.transactionId = refId || esewaVerify.data.transaction_uuid;
      payment.gatewayResponse = esewaVerify.data;
      await payment.save();

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      return res.json({ success: true, message: 'eSewa payment verified', booking, payment });
    }

    return res.status(400).json({ success: false, message: 'Unknown payment method' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment history
// @route   GET /api/v1/payment/history
// @access  Private
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = req.user.role === 'customer' ? { userId: req.user._id } : {};

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate({ path: 'bookingId', populate: { path: 'courtId', select: 'courtName location' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      payments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate refund
// @route   POST /api/v1/payment/refund/:bookingId
// @access  Private (Owner/Admin)
const initiateRefund = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('courtId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const payment = await Payment.findOne({ bookingId: booking._id, status: 'completed' });
    if (!payment) return res.status(404).json({ success: false, message: 'No completed payment found' });

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.refundReason = req.body.reason || 'Refund initiated by admin';
    await payment.save();

    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Refund issued';
    await booking.save();

    res.json({ success: true, message: 'Refund processed', payment, booking });
  } catch (error) {
    next(error);
  }
};

module.exports = { initiatePayment, verifyPayment, getPaymentHistory, initiateRefund };

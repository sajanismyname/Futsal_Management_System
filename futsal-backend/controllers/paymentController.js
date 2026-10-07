const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
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
const { emitSlotUpdate, emitBookingUpdate } = require('../services/socketService');
const { parsePagination } = require('../utils/pagination');

const notifyPaymentConfirmed = async (booking) => {
  const populated = await Booking.findById(booking._id)
    .populate('courtId', 'courtName location price ownerId')
    .populate('userId', 'name email phone');

  if (!populated?.courtId) return;

  emitSlotUpdate({
    courtId: populated.courtId._id,
    bookingDate: populated.bookingDate,
    startTime: populated.startTime,
    endTime: populated.endTime,
    isBooked: true,
  });

  if (populated.courtId.ownerId) {
    emitBookingUpdate(populated.courtId.ownerId, populated, 'confirmed');
  }
};

const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('courtId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Customer can only initiate payment for their own booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'confirmed' || booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking is already paid' });
    }

    if (booking.status === 'cancelled' || booking.status === 'expired') {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled or expired booking' });
    }

    // Cancel / supersede any previous initiated payments for this booking (FMS-QA-032)
    await Payment.updateMany(
      { bookingId: booking._id, status: 'initiated' },
      { $set: { status: 'failed', gatewayResponse: { reason: 'superseded_by_new_initiation' } } }
    );

    const isMockAllowed =
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
      process.env.MOCK_PAYMENT === 'true';

    // Mock payment guard - never permitted in production (FMS-QA-033)
    if (paymentMethod === 'mock') {
      if (!isMockAllowed) {
        return res.status(403).json({ success: false, message: 'Mock payment is not allowed in production' });
      }

      const payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        transactionId: `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: booking.totalAmount,
        paymentMethod: 'mock',
        status: 'initiated',
      });

      return res.json({
        success: true,
        paymentMethod: 'mock',
        mockVerifyUrl: '/api/v1/payment/verify',
        paymentId: payment._id,
        amount: booking.totalAmount,
        message: 'Mock payment initiated. Call verify endpoint to complete.',
      });
    }

    if (paymentMethod === 'khalti') {
      try {
        const khaltiBaseUrl = process.env.KHALTI_API_URL || process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2';
        const khaltiRes = await axios.post(
          `${khaltiBaseUrl}/epayment/initiate/`,
          {
            return_url: `${process.env.FRONTEND_URL}/payment/verify`,
            website_url: process.env.FRONTEND_URL,
            amount: Math.round(booking.totalAmount * 100),
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
      } catch (khaltiErr) {
        console.error('Khalti initiate error:', khaltiErr.response?.data || khaltiErr.message);
        return res.status(502).json({
          success: false,
          message: 'Failed to initiate payment with Khalti. Please try again.',
        });
      }
    }

    if (paymentMethod === 'esewa') {
      const transactionId = `ESEWA-${booking._id}-${Date.now()}`;
      const payment = await Payment.create({
        bookingId: booking._id,
        userId: req.user._id,
        transactionId,
        amount: booking.totalAmount,
        paymentMethod: 'esewa',
        status: 'initiated',
      });

      const productCode = process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
      const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
      const totalAmount = booking.totalAmount;
      const signatureString = `total_amount=${totalAmount},transaction_uuid=${payment.transactionId},product_code=${productCode}`;
      const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');

      return res.json({
        success: true,
        paymentMethod: 'esewa',
        esewaConfig: {
          amount: totalAmount,
          tax_amount: 0,
          total_amount: totalAmount,
          transaction_uuid: payment.transactionId,
          product_code: productCode,
          product_service_charge: 0,
          product_delivery_charge: 0,
          success_url: `${process.env.FRONTEND_URL}/payment/verify?method=esewa&paymentId=${payment._id}`,
          failure_url: `${process.env.FRONTEND_URL}/payment/failure`,
          signed_field_names: 'total_amount,transaction_uuid,product_code',
          signature: signature,
          // Legacy aliases for backward compatibility
          amt: totalAmount,
          psc: 0,
          pdc: 0,
          txAmt: 0,
          tAmt: totalAmount,
          pid: payment.transactionId,
          scd: productCode,
          su: `${process.env.FRONTEND_URL}/payment/verify?method=esewa&paymentId=${payment._id}`,
          fu: `${process.env.FRONTEND_URL}/payment/failure`,
        },
        esewaUrl: process.env.ESEWA_PAYMENT_URL || `${process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np'}/api/epay/main/v2/form`,
        paymentId: payment._id,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { pidx, paymentId, bookingId, refId } = req.body;

    // Resolve payment record flexibly by paymentId, pidx, or bookingId (FMS-QA-059)
    let payment;
    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
    } else if (pidx) {
      payment = await Payment.findOne({ pidx });
    } else if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      payment = await Payment.findOne({
        bookingId,
        userId: req.user._id,
        status: { $in: ['initiated', 'completed'] },
      }).sort({ createdAt: -1 });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    // Payment ownership verification (FMS-QA-003)
    if (req.user.role !== 'admin' && payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to verify this payment' });
    }

    const booking = await Booking.findById(payment.bookingId).populate('courtId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Associated booking not found' });
    }

    // Idempotent: If already completed, return existing success state (FMS-QA-031, FMS-QA-060)
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment verified',
        booking,
        payment,
      });
    }

    // Mock payment verification (FMS-QA-033)
    if (payment.paymentMethod === 'mock') {
      const isMockAllowed =
        (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
        process.env.MOCK_PAYMENT === 'true';

      if (!isMockAllowed) {
        return res.status(403).json({ success: false, message: 'Mock payment not allowed' });
      }

      // Atomic transition from initiated -> completed (FMS-QA-031)
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'initiated' },
        {
          $set: {
            status: 'completed',
            transactionId: payment.transactionId || `MOCK-VERIFIED-${Date.now()}`,
          },
        },
        { new: true }
      );

      if (!updatedPayment) {
        const current = await Payment.findById(payment._id);
        return res.json({ success: true, message: 'Payment verified', booking, payment: current });
      }

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      const user = await User.findById(payment.userId);
      if (user && user.emailNotifications) {
        sendEmail(bookingConfirmedEmail(user, booking, booking.courtId)).catch(() => {});
        sendEmail(paymentReceiptEmail(user, updatedPayment, booking, booking.courtId)).catch(() => {});
      }

      await createInAppNotification({
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Payment of NPR ${payment.amount} confirmed for ${booking.courtId.courtName}.`,
        type: 'payment_success',
        relatedId: updatedPayment._id,
        relatedModel: 'Payment',
      });

      await notifyPaymentConfirmed(booking);

      return res.json({ success: true, message: 'Payment verified (mock)', booking, payment: updatedPayment });
    }

    // Khalti payment verification (FMS-QA-004, FMS-QA-028, FMS-QA-029)
    if (payment.paymentMethod === 'khalti') {
      // Must verify submitted pidx matches stored payment.pidx
      if (!pidx || pidx !== payment.pidx) {
        return res.status(400).json({ success: false, message: 'Invalid payment transaction: pidx mismatch' });
      }

      let khaltiVerify;
      try {
        const khaltiBaseUrl = process.env.KHALTI_API_URL || process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2';
        khaltiVerify = await axios.post(
          `${khaltiBaseUrl}/epayment/lookup/`,
          { pidx },
          { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
        );
      } catch (khaltiErr) {
        console.error('Khalti lookup error:', khaltiErr.response?.data || khaltiErr.message);
        return res.status(502).json({
          success: false,
          message: 'Payment verification failed with provider. Please try again.',
        });
      }

      if (khaltiVerify.data.status !== 'Completed') {
        payment.status = 'failed';
        payment.gatewayResponse = khaltiVerify.data;
        await payment.save();
        return res.status(400).json({ success: false, message: 'Khalti payment not completed', data: khaltiVerify.data });
      }

      // Verify provider purchase_order_id matches booking ID (FMS-QA-029)
      if (khaltiVerify.data.purchase_order_id !== booking._id.toString()) {
        return res.status(400).json({ success: false, message: 'Purchase order mismatch' });
      }

      // Verify provider amount equals payment amount (FMS-QA-028)
      const expectedPaisa = Math.round(payment.amount * 100);
      if (khaltiVerify.data.total_amount !== expectedPaisa) {
        return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
      }

      // Atomic update (FMS-QA-031)
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'initiated' },
        {
          $set: {
            status: 'completed',
            transactionId: khaltiVerify.data.transaction_id,
            gatewayResponse: khaltiVerify.data,
          },
        },
        { new: true }
      );

      if (!updatedPayment) {
        const current = await Payment.findById(payment._id);
        return res.json({ success: true, message: 'Payment verified', booking, payment: current });
      }

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      const user = await User.findById(payment.userId);
      if (user && user.emailNotifications) {
        sendEmail(bookingConfirmedEmail(user, booking, booking.courtId)).catch(() => {});
        sendEmail(paymentReceiptEmail(user, updatedPayment, booking, booking.courtId)).catch(() => {});
      }

      await createInAppNotification({
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Payment of NPR ${payment.amount} confirmed for ${booking.courtId.courtName}.`,
        type: 'payment_success',
        relatedId: updatedPayment._id,
        relatedModel: 'Payment',
      });

      await notifyPaymentConfirmed(booking);

      return res.json({ success: true, message: 'Khalti payment verified', booking, payment: updatedPayment });
    }

    // eSewa payment verification (FMS-QA-028, FMS-QA-030)
    if (payment.paymentMethod === 'esewa') {
      let esewaVerify;
      const statusUrl = process.env.ESEWA_STATUS_URL || `${process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np'}/api/epay/transaction/status/`;
      const productCode = process.env.ESEWA_PRODUCT_CODE || process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
      try {
        esewaVerify = await axios.get(statusUrl, {
          params: {
            product_code: productCode,
            total_amount: payment.amount,
            transaction_uuid: payment.transactionId,
          },
        });
      } catch (getErr) {
        try {
          esewaVerify = await axios.post(statusUrl, {
            product_code: productCode,
            total_amount: payment.amount,
            transaction_uuid: payment.transactionId,
          });
        } catch (postErr) {
          console.error('eSewa status lookup error:', postErr.response?.data || postErr.message || getErr.message);
          return res.status(502).json({
            success: false,
            message: 'eSewa gateway verification failed. Please try again.',
          });
        }
      }

      if (esewaVerify.data?.status !== 'COMPLETE') {
        payment.status = 'failed';
        payment.gatewayResponse = esewaVerify.data;
        await payment.save();
        return res.status(400).json({ success: false, message: 'eSewa payment not completed' });
      }

      // Verify amount (FMS-QA-028)
      if (Number(esewaVerify.data.total_amount) !== Number(payment.amount)) {
        return res.status(400).json({ success: false, message: 'eSewa amount mismatch' });
      }

      const authoritativeTxnId = esewaVerify.data.ref_id || refId || payment.transactionId;

      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'initiated' },
        {
          $set: {
            status: 'completed',
            transactionId: authoritativeTxnId,
            gatewayResponse: esewaVerify.data,
          },
        },
        { new: true }
      );

      if (!updatedPayment) {
        const current = await Payment.findById(payment._id);
        return res.json({ success: true, message: 'Payment verified', booking, payment: current });
      }

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      await booking.save();

      const esewaUser = await User.findById(payment.userId);
      if (esewaUser && esewaUser.emailNotifications) {
        sendEmail(bookingConfirmedEmail(esewaUser, booking, booking.courtId)).catch(() => {});
        sendEmail(paymentReceiptEmail(esewaUser, updatedPayment, booking, booking.courtId)).catch(() => {});
      }

      await createInAppNotification({
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Payment of NPR ${payment.amount} confirmed for ${booking.courtId.courtName}.`,
        type: 'payment_success',
        relatedId: updatedPayment._id,
        relatedModel: 'Payment',
      });

      await notifyPaymentConfirmed(booking);

      return res.json({ success: true, message: 'eSewa payment verified', booking, payment: updatedPayment });
    }

    return res.status(400).json({ success: false, message: 'Unknown payment method' });
  } catch (error) {
    next(error);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    let query = {};

    // Explicit scoping for customer, owner, and admin (FMS-QA-036)
    if (req.user.role === 'customer') {
      query.userId = req.user._id;
    } else if (req.user.role === 'owner') {
      const ownerCourts = await Court.find({ ownerId: req.user._id }).select('_id');
      const ownerCourtIds = ownerCourts.map((c) => c._id);
      const ownerBookings = await Booking.find({ courtId: { $in: ownerCourtIds } }).select('_id');
      query.bookingId = { $in: ownerBookings.map((b) => b._id) };
    }
    // Admin gets all platform payments

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate({ path: 'bookingId', populate: { path: 'courtId', select: 'courtName location' } })
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      payments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const initiateRefund = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Valid booking ID is required' });
    }

    const booking = await Booking.findById(bookingId).populate('courtId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Court owner can only refund bookings on courts they own (FMS-QA-006)
    if (req.user.role === 'owner') {
      if (!booking.courtId || booking.courtId.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to refund bookings for this court' });
      }
    }

    const payment = await Payment.findOne({ bookingId: booking._id }).sort({ createdAt: -1 });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'No payment record found for this booking' });
    }

    // Idempotency check: prevent duplicate refund (FMS-QA-034)
    if (payment.status === 'refunded' || payment.refundStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Payment has already been refunded' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Only completed payments can be refunded' });
    }

    // Actor-aware audit reason (FMS-QA-035)
    const actorRole = req.user.role === 'admin' ? 'admin' : 'court owner';
    const auditReason = req.body.reason
      ? `${req.body.reason} (Initiated by ${actorRole})`
      : `Refund initiated by ${actorRole}`;

    // Atomically transition payment to refunded (FMS-QA-005, FMS-QA-034)
    payment.status = 'refunded';
    payment.refundStatus = 'completed';
    payment.refundedAt = new Date();
    payment.refundReason = auditReason;
    payment.refundedBy = req.user._id;
    await payment.save();

    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
    booking.cancellationReason = auditReason;
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    await booking.save();

    // Release court slot
    emitSlotUpdate({
      courtId: booking.courtId._id,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      isBooked: false,
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      payment,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { initiatePayment, verifyPayment, getPaymentHistory, initiateRefund };

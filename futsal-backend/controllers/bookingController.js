const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { sendEmail, createInAppNotification, bookingCancelledEmail } = require('../services/notificationService');
const { emitSlotUpdate, emitBookingUpdate } = require('../services/socketService');
const { parsePagination } = require('../utils/pagination');

const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const timesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

const notifyBookingChange = async (booking, action, isBooked) => {
  const populated = await Booking.findById(booking._id)
    .populate('courtId', 'courtName location price ownerId')
    .populate('userId', 'name email phone');

  if (!populated?.courtId) return;

  emitSlotUpdate({
    courtId: populated.courtId._id,
    bookingDate: populated.bookingDate,
    startTime: populated.startTime,
    endTime: populated.endTime,
    isBooked,
  });

  if (populated.courtId.ownerId) {
    emitBookingUpdate(populated.courtId.ownerId, populated, action);
  }
};

const createBooking = async (req, res, next) => {
  let session = null;
  let useTransaction = false;

  try {
    const { courtId, bookingDate, startTime, endTime, notes } = req.body;

    const court = await Court.findById(courtId);
    if (!court || !court.isApproved || !court.isActive) {
      return res.status(404).json({ success: false, message: 'Court not found or unavailable' });
    }

    // Date validation - reject past dates (FMS-QA-015)
    const normalizedDate = new Date(bookingDate);
    if (isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid booking date' });
    }
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (normalizedDate < today) {
      return res.status(400).json({ success: false, message: 'Booking date cannot be in the past' });
    }

    // Time validation - start < end (FMS-QA-016)
    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);
    if (startMin >= endMin) {
      return res.status(400).json({ success: false, message: 'Start time must be earlier than end time' });
    }

    // Slot granularity check (FMS-QA-018)
    if (startMin % 30 !== 0 || endMin % 30 !== 0) {
      return res.status(400).json({ success: false, message: 'Booking times must align with 30-minute intervals' });
    }

    // Operating hours validation (FMS-QA-017)
    const courtOpenMin = toMinutes(court.operatingHours?.open || '06:00');
    const courtCloseMin = toMinutes(court.operatingHours?.close || '22:00');
    if (startMin < courtOpenMin || endMin > courtCloseMin) {
      return res.status(400).json({
        success: false,
        message: `Booking must fall within court operating hours (${court.operatingHours?.open || '06:00'} - ${court.operatingHours?.close || '22:00'})`,
      });
    }

    // Concurrency and replica set handling (FMS-QA-025, FMS-QA-026)
    const client = mongoose.connection.getClient ? mongoose.connection.getClient() : mongoose.connection.client;
    const topologyType = client?.topology?.description?.type;
    const supportsTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    if (supportsTransactions) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        session = null;
        useTransaction = false;
      }
    }

    const sessionOption = useTransaction ? { session } : {};

    const conflict = await Booking.findOne({
      courtId,
      bookingDate: normalizedDate,
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    }, null, sessionOption);

    if (conflict) {
      if (useTransaction && session) await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'This time slot is already booked' });
    }

    // Authoritative price calculation on server (FMS-QA-063)
    const durationHours = (endMin - startMin) / 60;
    const totalAmount = durationHours * court.price;

    const bookingData = {
      userId: req.user._id,
      courtId,
      bookingDate: normalizedDate,
      startTime,
      endTime,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes,
    };

    let booking;
    if (useTransaction && session) {
      const created = await Booking.create([bookingData], { session });
      booking = created[0];
      await session.commitTransaction();
    } else {
      booking = await Booking.create(bookingData);
    }

    // Notification type is booking_created (FMS-QA-027)
    await createInAppNotification({
      userId: req.user._id,
      title: 'Booking Created',
      message: `Your booking for ${court.courtName} on ${normalizedDate.toDateString()} (${startTime}-${endTime}) is pending payment.`,
      type: 'booking_created',
      relatedId: booking._id,
      relatedModel: 'Booking',
    });

    await notifyBookingChange(booking, 'created', true);

    res.status(201).json({
      success: true,
      message: 'Booking created. Complete payment to confirm.',
      booking,
    });
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const getBookings = async (req, res, next) => {
  try {
    const { status, courtId, startDate, endDate } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    let query = {};

    if (req.user.role === 'customer') {
      query.userId = req.user._id;
    } else if (req.user.role === 'owner') {
      const ownerCourts = await Court.find({ ownerId: req.user._id }).select('_id');
      query.courtId = { $in: ownerCourts.map((c) => c._id) };
    }

    if (status) query.status = status;
    if (courtId) query.courtId = courtId;
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('courtId', 'courtName location price ownerId')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      bookings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('courtId', 'courtName location price operatingHours ownerId')
      .populate('userId', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Strict resource ownership checks (FMS-QA-022)
    const isCustomer = booking.userId?._id?.toString() === req.user._id.toString();
    const isCourtOwner =
      req.user.role === 'owner' &&
      booking.courtId?.ownerId &&
      booking.courtId.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isCourtOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { courtId } = req.params;

    // Validate date parameter (FMS-QA-020)
    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ success: false, message: 'Valid date query parameter is required (YYYY-MM-DD)' });
    }

    const court = await Court.findById(courtId);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    // Restrict public slot availability to active and approved courts (FMS-QA-021)
    if (!court.isApproved || !court.isActive) {
      return res.status(404).json({ success: false, message: 'Court is inactive or pending approval' });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const existingBookings = await Booking.find({
      courtId,
      bookingDate: normalizedDate,
      status: { $in: ['pending', 'confirmed'] },
    }).select('startTime endTime status');

    const [openH] = (court.operatingHours?.open || '06:00').split(':').map(Number);
    const [closeH] = (court.operatingHours?.close || '22:00').split(':').map(Number);

    const slots = [];
    for (let hour = openH; hour < closeH; hour++) {
      const start = `${String(hour).padStart(2, '0')}:00`;
      const end = `${String(hour + 1).padStart(2, '0')}:00`;

      const isBooked = existingBookings.some((b) => timesOverlap(b.startTime, b.endTime, start, end));

      slots.push({ start, end, isBooked });
    }

    res.json({ success: true, slots, court: { courtName: court.courtName, price: court.price } });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('courtId userId');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isCustomer = booking.userId?._id?.toString() === req.user._id.toString();
    const isOwnerOfCourt =
      req.user.role === 'owner' &&
      booking.courtId?.ownerId &&
      booking.courtId.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isOwnerOfCourt && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (['cancelled', 'expired'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled or expired' });
    }

    const cancellationReason = req.body.reason || 'Cancelled by user';
    booking.status = 'cancelled';
    booking.cancellationReason = cancellationReason;
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();

    // Paid cancellation workflow (FMS-QA-023)
    if (booking.paymentStatus === 'paid') {
      const payment = await Payment.findOne({ bookingId: booking._id, status: 'completed' });
      if (payment) {
        payment.status = 'refunded';
        payment.refundStatus = 'completed';
        payment.refundedAt = new Date();
        payment.refundReason = `Cancellation refund: ${cancellationReason}`;
        payment.refundedBy = req.user._id;
        await payment.save();
      }
      booking.paymentStatus = 'refunded';
    }

    await booking.save();

    const user = await User.findById(booking.userId._id || booking.userId);
    if (user && user.emailNotifications) {
      await sendEmail(bookingCancelledEmail(user, booking, booking.courtId));
    }

    await createInAppNotification({
      userId: booking.userId._id || booking.userId,
      title: 'Booking Cancelled',
      message: `Your booking for ${booking.courtId.courtName} has been cancelled.`,
      type: 'booking_cancelled',
      relatedId: booking._id,
      relatedModel: 'Booking',
    });

    await notifyBookingChange(booking, 'cancelled', false);

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getBookings, getBooking, getAvailableSlots, cancelBooking };

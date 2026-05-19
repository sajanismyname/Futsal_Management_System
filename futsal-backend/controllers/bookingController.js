const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const { sendEmail, createInAppNotification, bookingCancelledEmail } = require('../services/notificationService');
const User = require('../models/User');

// Helper: check if time slots overlap
const timesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

// @desc    Create booking (atomic conflict detection)
// @route   POST /api/v1/bookings
// @access  Private (Customer)
const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courtId, bookingDate, startTime, endTime } = req.body;

    const court = await Court.findById(courtId).session(session);
    if (!court || !court.isApproved || !court.isActive) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Court not found or unavailable' });
    }

    // Normalize date to midnight UTC
    const normalizedDate = new Date(bookingDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // Atomic conflict check: find any confirmed/pending booking for same court+date that overlaps
    const conflict = await Booking.findOne({
      courtId,
      bookingDate: normalizedDate,
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'This time slot is already booked' });
    }

    // Calculate duration in hours and total amount
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    const totalAmount = durationHours * court.price;

    const booking = await Booking.create(
      [
        {
          userId: req.user._id,
          courtId,
          bookingDate: normalizedDate,
          startTime,
          endTime,
          totalAmount,
          status: 'pending',
          paymentStatus: 'unpaid',
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await createInAppNotification({
      userId: req.user._id,
      title: 'Booking Created',
      message: `Your booking for ${court.courtName} on ${normalizedDate.toDateString()} (${startTime}-${endTime}) is pending payment.`,
      type: 'booking_confirmed',
      relatedId: booking[0]._id,
      relatedModel: 'Booking',
    });

    res.status(201).json({
      success: true,
      message: 'Booking created. Complete payment to confirm.',
      booking: booking[0],
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get bookings (role-based)
// @route   GET /api/v1/bookings
// @access  Private
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, courtId, startDate, endDate } = req.query;

    let query = {};

    if (req.user.role === 'customer') {
      query.userId = req.user._id;
    } else if (req.user.role === 'owner') {
      const ownerCourts = await Court.find({ ownerId: req.user._id }).select('_id');
      query.courtId = { $in: ownerCourts.map((c) => c._id) };
    }
    // admin sees all

    if (status) query.status = status;
    if (courtId) query.courtId = courtId;
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('courtId', 'courtName location price')
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      bookings,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('courtId', 'courtName location price operatingHours ownerId')
      .populate('userId', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Access control
    const isOwner =
      req.user.role === 'admin' ||
      booking.userId._id.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available slots for a court on a date
// @route   GET /api/v1/bookings/slots/:courtId
// @access  Public
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { courtId } = req.params;

    const court = await Court.findById(courtId);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });

    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const existingBookings = await Booking.find({
      courtId,
      bookingDate: normalizedDate,
      status: { $in: ['pending', 'confirmed'] },
    }).select('startTime endTime status');

    // Generate hourly slots based on operating hours
    const [openH] = court.operatingHours.open.split(':').map(Number);
    const [closeH] = court.operatingHours.close.split(':').map(Number);

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

// @desc    Cancel booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('courtId userId');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isCustomer = booking.userId._id.toString() === req.user._id.toString();
    const isOwnerOfCourt =
      req.user.role === 'owner' &&
      booking.courtId.ownerId &&
      booking.courtId.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomer && !isOwnerOfCourt && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    if (['cancelled', 'expired'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled or expired' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'Cancelled by user';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();

    await booking.save();

    // Send cancellation email
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

    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getBookings, getBooking, getAvailableSlots, cancelBooking };

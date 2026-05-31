const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Tournament = require('../models/Tournament');
const RestrictedPhone = require('../models/RestrictedPhone');

const normalizeCourt = (court) => {
  const obj = court.toObject ? court.toObject() : court;
  const approvalStatus = obj.approvalStatus || (obj.isApproved ? 'approved' : 'pending');
  return { ...obj, approvalStatus };
};

const getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalCourts, totalBookings, revenueResult, pendingCourts, activeTournaments] =
      await Promise.all([
        User.countDocuments(),
        Court.countDocuments({ isApproved: true, isActive: true }),
        Booking.countDocuments(),
        Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
        Court.countDocuments({
          isActive: true,
          $or: [
            { approvalStatus: 'pending' },
            { approvalStatus: { $exists: false }, isApproved: false },
          ],
        }),
        Tournament.countDocuments({ status: { $in: ['upcoming', 'registration_open', 'ongoing'] } }),
      ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCourts,
        totalBookings,
        totalRevenue,
        pendingCourts,
        activeTournaments,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRevenue = async (req, res, next) => {
  try {
    const { period = 'daily', days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    let groupBy;
    if (period === 'monthly') {
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    } else if (period === 'weekly') {
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
    } else {
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    }

    const revenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      { $group: { _id: groupBy, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    res.json({ success: true, revenue });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, isSuspended } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isSuspended !== undefined) query.isSuspended = isSuspended === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

const toggleSuspend = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend another admin' });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    res.json({
      success: true,
      message: user.isSuspended ? 'User suspended' : 'User unsuspended',
      user,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete another admin' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.bookingDate = {};
      if (startDate) query.bookingDate.$gte = new Date(startDate);
      if (endDate) query.bookingDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('userId', 'name email')
        .populate('courtId', 'courtName location ownerId')
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

const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'name email')
        .populate({ path: 'bookingId', populate: { path: 'courtId', select: 'courtName' } })
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

const getPendingCourts = async (req, res, next) => {
  try {
    const courts = await Court.find({
      isActive: true,
      $or: [
        { approvalStatus: 'pending' },
        { approvalStatus: { $exists: false }, isApproved: false },
      ],
    })
      .populate('ownerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, courts: courts.map(normalizeCourt) });
  } catch (error) {
    next(error);
  }
};

const getAdminCourts = async (req, res, next) => {
  try {
    const { approvalStatus, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (approvalStatus === 'pending') {
      query.$or = [
        { approvalStatus: 'pending' },
        { approvalStatus: { $exists: false }, isApproved: false },
      ];
    } else if (approvalStatus === 'approved') {
      query.$or = [
        { approvalStatus: 'approved' },
        { approvalStatus: { $exists: false }, isApproved: true },
      ];
    } else if (approvalStatus === 'rejected') {
      query.approvalStatus = 'rejected';
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [courts, total] = await Promise.all([
      Court.find(query)
        .populate('ownerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Court.countDocuments(query),
    ]);

    res.json({
      success: true,
      courts: courts.map(normalizeCourt),
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const restrictPhone = async (req, res, next) => {
  try {
    const { phone, reason } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });

    const existing = await RestrictedPhone.findOne({ phone });
    if (existing) {
      await RestrictedPhone.deleteOne({ phone });
      return res.json({ success: true, message: 'Phone number unrestricted', restricted: false });
    }

    await RestrictedPhone.create({ phone, restrictedBy: req.user._id, reason: reason || '' });
    res.json({ success: true, message: 'Phone number restricted', restricted: true });
  } catch (error) {
    next(error);
  }
};

const getRestrictedPhones = async (req, res, next) => {
  try {
    const phones = await RestrictedPhone.find().sort({ createdAt: -1 });
    res.json({ success: true, phones });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getRevenue, getUsers, toggleSuspend, deleteUser, getAllBookings, getAllPayments, getPendingCourts, getAdminCourts, restrictPhone, getRestrictedPhones };

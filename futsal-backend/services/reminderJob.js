const cron = require('node-cron');
const Booking = require('../models/Booking');
const { sendEmail, bookingReminderEmail } = require('./notificationService');
const { emitSlotUpdate, emitBookingUpdate } = require('./socketService');

const expirePendingBookings = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const expiredBookings = await Booking.find({
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: { $lt: cutoff },
    })
      .populate('courtId', 'courtName location price ownerId')
      .populate('userId', 'name email phone');

    if (expiredBookings.length === 0) return;

    await Booking.updateMany(
      { _id: { $in: expiredBookings.map((b) => b._id) } },
      { status: 'expired' }
    );

    for (const booking of expiredBookings) {
      if (!booking.courtId) continue;

      emitSlotUpdate({
        courtId: booking.courtId._id,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        isBooked: false,
      });

      if (booking.courtId.ownerId) {
        // Emit refreshed document status (FMS-QA-079)
        const updatedBooking = { ...booking.toObject(), status: 'expired' };
        emitBookingUpdate(booking.courtId.ownerId, updatedBooking, 'expired');
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Cron] Expired ${expiredBookings.length} pending bookings`);
    }
  } catch (error) {
    console.error('[Cron] Error expiring pending bookings:', error.message);
  }
};

const sendBookingReminders = async () => {
  try {
    // Calculate tomorrow based on Nepal business timezone (Asia/Kathmandu, UTC+5:45) (FMS-QA-077)
    const nowUtc = Date.now();
    const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
    const nepalNow = new Date(nowUtc + nepalOffsetMs);

    const nepalYear = nepalNow.getUTCFullYear();
    const nepalMonth = nepalNow.getUTCMonth();
    const nepalDate = nepalNow.getUTCDate() + 1; // Tomorrow

    const startOfTomorrowUtc = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate, 0, 0, 0) - nepalOffsetMs);
    const endOfTomorrowUtc = new Date(Date.UTC(nepalYear, nepalMonth, nepalDate, 23, 59, 59, 999) - nepalOffsetMs);

    const bookings = await Booking.find({
      status: 'confirmed',
      bookingDate: { $gte: startOfTomorrowUtc, $lte: endOfTomorrowUtc },
    }).populate('courtId userId');

    for (const booking of bookings) {
      const user = booking.userId;
      if (user && user.emailNotifications) {
        await sendEmail(bookingReminderEmail(user, booking, booking.courtId));
      }
    }

    if (bookings.length > 0 && process.env.NODE_ENV !== 'test') {
      console.log(`[Cron] Sent ${bookings.length} reminder emails for tomorrow (Asia/Kathmandu)`);
    }
  } catch (error) {
    console.error('[Cron] Error sending reminders:', error.message);
  }
};

const startCronJobs = () => {
  // Use explicit Asia/Kathmandu timezone for all scheduled cron jobs (FMS-QA-078)
  const cronOptions = {
    scheduled: true,
    timezone: 'Asia/Kathmandu',
  };

  cron.schedule('*/10 * * * *', expirePendingBookings, cronOptions);
  cron.schedule('0 8 * * *', sendBookingReminders, cronOptions);

  if (process.env.NODE_ENV !== 'test') {
    console.log('[Cron] Jobs scheduled: expire pending bookings (every 10min), reminders (8:00 AM daily Asia/Kathmandu)');
  }
};

module.exports = { startCronJobs, expirePendingBookings, sendBookingReminders };

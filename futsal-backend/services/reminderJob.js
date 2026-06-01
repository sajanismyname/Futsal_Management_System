const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Court = require('../models/Court');
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
        booking.status = 'expired';
        emitBookingUpdate(booking.courtId.ownerId, booking, 'expired');
      }
    }

    console.log(`[Cron] Expired ${expiredBookings.length} pending bookings`);
  } catch (error) {
    console.error('[Cron] Error expiring pending bookings:', error.message);
  }
};

const sendBookingReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setUTCHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      status: 'confirmed',
      bookingDate: { $gte: tomorrow, $lte: dayAfter },
    }).populate('courtId userId');

    for (const booking of bookings) {
      const user = booking.userId;
      if (user && user.emailNotifications) {
        await sendEmail(bookingReminderEmail(user, booking, booking.courtId));
      }
    }

    if (bookings.length > 0) {
      console.log(`[Cron] Sent ${bookings.length} reminder emails`);
    }
  } catch (error) {
    console.error('[Cron] Error sending reminders:', error.message);
  }
};

const startCronJobs = () => {
  cron.schedule('*/10 * * * *', expirePendingBookings);
  cron.schedule('0 8 * * *', sendBookingReminders);

  console.log('[Cron] Jobs scheduled: expire pending bookings (every 10min), reminders (8AM daily)');
};

module.exports = { startCronJobs };

const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Court = require('../models/Court');
const { sendEmail, bookingReminderEmail } = require('./notificationService');

// Expire pending bookings older than 30 minutes
const expirePendingBookings = async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const result = await Booking.updateMany(
      { status: 'pending', paymentStatus: 'unpaid', createdAt: { $lt: cutoff } },
      { status: 'expired' }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Cron] Expired ${result.modifiedCount} pending bookings`);
    }
  } catch (error) {
    console.error('[Cron] Error expiring pending bookings:', error.message);
  }
};

// Send reminder emails 24h before booking
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
  // Expire pending bookings every 10 minutes
  cron.schedule('*/10 * * * *', expirePendingBookings);

  // Send reminders every day at 8 AM
  cron.schedule('0 8 * * *', sendBookingReminders);

  console.log('[Cron] Jobs scheduled: expire pending bookings (every 10min), reminders (8AM daily)');
};

module.exports = { startCronJobs };

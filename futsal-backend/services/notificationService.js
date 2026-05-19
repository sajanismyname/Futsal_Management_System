const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
    console.log(`[Email skipped - not configured] To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
  }
};

const sendSMS = async (phone, message) => {
  if (!process.env.SPARROW_SMS_TOKEN || process.env.SPARROW_SMS_TOKEN === 'your_sparrow_token') {
    console.log(`[SMS skipped - not configured] To: ${phone}, Message: ${message}`);
    return;
  }

  try {
    const axios = require('axios');
    await axios.post('http://api.sparrowsms.com/v2/sms/', null, {
      params: {
        token: process.env.SPARROW_SMS_TOKEN,
        from: 'FutsalMgmt',
        to: phone,
        text: message,
      },
    });
    console.log(`SMS sent to ${phone}`);
  } catch (error) {
    console.error(`Failed to send SMS to ${phone}:`, error.message);
  }
};

const createInAppNotification = async ({ userId, title, message, type, relatedId, relatedModel }) => {
  try {
    await Notification.create({ userId, title, message, type, relatedId, relatedModel });
  } catch (error) {
    console.error('Failed to create in-app notification:', error.message);
  }
};

const bookingConfirmedEmail = (user, booking, court) => ({
  to: user.email,
  subject: 'Booking Confirmed - Futsal Management',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="color:#10b981">Booking Confirmed!</h2>
      <p>Hi ${user.name},</p>
      <p>Your court booking has been confirmed. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Court</td><td style="padding:8px">${court.courtName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Location</td><td style="padding:8px">${court.location}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Date</td><td style="padding:8px">${new Date(booking.bookingDate).toDateString()}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Time</td><td style="padding:8px">${booking.startTime} - ${booking.endTime}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Amount Paid</td><td style="padding:8px">NPR ${booking.totalAmount}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px">Thank you for using Futsal Management System!</p>
    </div>
  `,
});

const bookingCancelledEmail = (user, booking, court) => ({
  to: user.email,
  subject: 'Booking Cancelled - Futsal Management',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="color:#ef4444">Booking Cancelled</h2>
      <p>Hi ${user.name},</p>
      <p>Your booking for <strong>${court.courtName}</strong> on <strong>${new Date(booking.bookingDate).toDateString()}</strong> (${booking.startTime} - ${booking.endTime}) has been cancelled.</p>
      ${booking.cancellationReason ? `<p>Reason: ${booking.cancellationReason}</p>` : ''}
      <p>If a payment was made, a refund will be processed within 5-7 business days.</p>
      <p style="color:#6b7280;font-size:14px">Futsal Management System</p>
    </div>
  `,
});

const bookingReminderEmail = (user, booking, court) => ({
  to: user.email,
  subject: 'Booking Reminder - Tomorrow',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="color:#3b82f6">Booking Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>This is a reminder that you have a futsal booking tomorrow:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Court</td><td style="padding:8px">${court.courtName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Date</td><td style="padding:8px">${new Date(booking.bookingDate).toDateString()}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Time</td><td style="padding:8px">${booking.startTime} - ${booking.endTime}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px">See you on the court!</p>
    </div>
  `,
});

const paymentReceiptEmail = (user, payment, booking, court) => ({
  to: user.email,
  subject: 'Payment Receipt - Futsal Management',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <h2 style="color:#10b981">Payment Receipt</h2>
      <p>Hi ${user.name},</p>
      <p>Your payment has been successfully processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Transaction ID</td><td style="padding:8px">${payment.transactionId || payment._id}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Amount</td><td style="padding:8px">NPR ${payment.amount}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Method</td><td style="padding:8px">${payment.paymentMethod.toUpperCase()}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Court</td><td style="padding:8px">${court.courtName}</td></tr>
        <tr><td style="padding:8px;background:#f9fafb;font-weight:600">Date</td><td style="padding:8px">${new Date(booking.bookingDate).toDateString()}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:14px">Futsal Management System</p>
    </div>
  `,
});

module.exports = {
  sendEmail,
  sendSMS,
  createInAppNotification,
  bookingConfirmedEmail,
  bookingCancelledEmail,
  bookingReminderEmail,
  paymentReceiptEmail,
};

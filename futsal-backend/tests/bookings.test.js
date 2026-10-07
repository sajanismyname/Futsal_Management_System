const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

let ownerUser, otherOwner, customer1, customer2;
let ownerToken, otherOwnerToken, customer1Token, customer2Token;
let activeCourt;

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await Booking.deleteMany({});
  await Payment.deleteMany({});
  await Court.deleteMany({ courtName: /Booking Test Court/i });
  await User.deleteMany({ email: /booktest/i });

  ownerUser = await User.create({
    name: 'Booking Court Owner',
    email: 'booktestowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9801122334',
    isEmailVerified: true,
  });
  ownerToken = generateToken(ownerUser._id);

  otherOwner = await User.create({
    name: 'Other Court Owner',
    email: 'booktestotherowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9801122335',
    isEmailVerified: true,
  });
  otherOwnerToken = generateToken(otherOwner._id);

  customer1 = await User.create({
    name: 'Customer One',
    email: 'booktestcust1@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9801122336',
    isEmailVerified: true,
  });
  customer1Token = generateToken(customer1._id);

  customer2 = await User.create({
    name: 'Customer Two',
    email: 'booktestcust2@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9801122337',
    isEmailVerified: true,
  });
  customer2Token = generateToken(customer2._id);

  activeCourt = await Court.create({
    courtName: 'Booking Test Court',
    ownerId: ownerUser._id,
    location: 'Kathmandu',
    price: 1000,
    courtType: '5A',
    operatingHours: { open: '06:00', close: '22:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });
});

afterAll(async () => {
  await Booking.deleteMany({});
  await Payment.deleteMany({});
  await Court.deleteMany({ courtName: /Booking Test Court/i });
  await User.deleteMany({ email: /booktest/i });
  await mongoose.connection.close();
});

describe('Bookings API (FMS-QA-015 to FMS-QA-027)', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  it('should reject past booking dates (FMS-QA-015)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: '2020-01-01',
        startTime: '10:00',
        endTime: '11:00',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/past/i);
  });

  it('should reject when startTime >= endTime (FMS-QA-016)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '11:00',
        endTime: '10:00',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/earlier than end time/i);
  });

  it('should reject bookings outside operating hours (FMS-QA-017)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '05:00',
        endTime: '06:00',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/operating hours/i);
  });

  it('should reject arbitrary non-interval minutes (FMS-QA-018)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '06:17',
        endTime: '07:43',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/30-minute intervals/i);
  });

  it('should reject invalid time format (FMS-QA-019)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '99:99',
        endTime: '10:00',
      });

    expect(res.statusCode).toBe(400);
  });

  let createdBookingId;

  it('should create valid booking and use booking_created notification (FMS-QA-027)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '08:00',
        endTime: '09:00',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.booking.status).toBe('pending');
    expect(res.body.booking.totalAmount).toBe(1000); // 1 hr * 1000
    createdBookingId = res.body.booking._id;

    // Verify notification type is booking_created, NOT booking_confirmed
    const notif = await Notification.findOne({ relatedId: createdBookingId });
    expect(notif.type).toBe('booking_created');
  });

  it('should reject overlapping booking (FMS-QA-025)', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '08:00',
        endTime: '09:00',
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already booked/i);
  });

  it('should reject partial overlap booking', async () => {
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        courtId: activeCourt._id,
        bookingDate: futureDateStr,
        startTime: '08:30',
        endTime: '09:30',
      });

    expect(res.statusCode).toBe(409);
  });

  it('should enforce owner booking isolation in getBooking (FMS-QA-022)', async () => {
    // Customer 1 owns the booking -> 200
    const resCustomer = await request(app)
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(resCustomer.statusCode).toBe(200);

    // Customer 2 does NOT own the booking -> 403
    const resOtherCustomer = await request(app)
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(resOtherCustomer.statusCode).toBe(403);

    // Court owner who owns this court -> 200
    const resOwner = await request(app)
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resOwner.statusCode).toBe(200);

    // Other court owner who does NOT own this court -> 403
    const resOtherOwner = await request(app)
      .get(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`);
    expect(resOtherOwner.statusCode).toBe(403);
  });

  it('should validate date parameter in available slots (FMS-QA-020)', async () => {
    const res = await request(app).get(`/api/v1/bookings/slots/${activeCourt._id}?date=invaliddate`);
    expect(res.statusCode).toBe(400);
  });

  it('should handle paid cancellation and initiate refund state (FMS-QA-023)', async () => {
    // Mark booking paid
    await Booking.findByIdAndUpdate(createdBookingId, { status: 'confirmed', paymentStatus: 'paid' });
    await Payment.create({
      bookingId: createdBookingId,
      userId: customer1._id,
      amount: 1000,
      paymentMethod: 'mock',
      status: 'completed',
    });

    const res = await request(app)
      .delete(`/api/v1/bookings/${createdBookingId}`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ reason: 'Plan changed' });

    expect(res.statusCode).toBe(200);
    const updatedBooking = await Booking.findById(createdBookingId);
    expect(updatedBooking.status).toBe('cancelled');
    expect(updatedBooking.paymentStatus).toBe('refunded');

    const payment = await Payment.findOne({ bookingId: createdBookingId });
    expect(payment.status).toBe('refunded');
  });
});

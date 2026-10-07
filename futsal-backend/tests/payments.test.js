const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const generateToken = require('../utils/generateToken');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

let ownerUser, otherOwner, customer1, customer2;
let ownerToken, otherOwnerToken, customer1Token, customer2Token;
let testCourt;
let booking1;

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await Payment.deleteMany({});
  await Booking.deleteMany({});
  await Court.deleteMany({ courtName: /Payment Test Court/i });
  await User.deleteMany({ email: /paytest/i });

  ownerUser = await User.create({
    name: 'Payment Court Owner',
    email: 'paytestowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9802233441',
    isEmailVerified: true,
  });
  ownerToken = generateToken(ownerUser._id);

  otherOwner = await User.create({
    name: 'Other Court Owner',
    email: 'paytestotherowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9802233442',
    isEmailVerified: true,
  });
  otherOwnerToken = generateToken(otherOwner._id);

  customer1 = await User.create({
    name: 'Payment Customer 1',
    email: 'paytestcust1@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9802233443',
    isEmailVerified: true,
  });
  customer1Token = generateToken(customer1._id);

  customer2 = await User.create({
    name: 'Payment Customer 2',
    email: 'paytestcust2@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9802233444',
    isEmailVerified: true,
  });
  customer2Token = generateToken(customer2._id);

  testCourt = await Court.create({
    courtName: 'Payment Test Court',
    ownerId: ownerUser._id,
    location: 'Kathmandu',
    price: 1200,
    courtType: '5A',
    operatingHours: { open: '06:00', close: '22:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  booking1 = await Booking.create({
    userId: customer1._id,
    courtId: testCourt._id,
    bookingDate: tomorrow,
    startTime: '10:00',
    endTime: '11:00',
    totalAmount: 1200,
    status: 'pending',
    paymentStatus: 'unpaid',
  });
});

afterAll(async () => {
  await Payment.deleteMany({});
  await Booking.deleteMany({});
  await Court.deleteMany({ courtName: /Payment Test Court/i });
  await User.deleteMany({ email: /paytest/i });
  await mongoose.connection.close();
});

describe('Payments API (FMS-QA-003 to FMS-QA-006, FMS-QA-028 to 036)', () => {
  let paymentId;

  it('should initiate mock payment for own booking', async () => {
    const res = await request(app)
      .post('/api/v1/payment/initiate')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        bookingId: booking1._id,
        paymentMethod: 'mock',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paymentId).toBeDefined();
    paymentId = res.body.paymentId;
  });

  it('should reject payment verification by another user (FMS-QA-003)', async () => {
    const res = await request(app)
      .post('/api/v1/payment/verify')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ paymentId });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('should verify mock payment successfully for the owner user', async () => {
    const res = await request(app)
      .post('/api/v1/payment/verify')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ paymentId });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.status).toBe('completed');
  });

  it('should be idempotent on duplicate verification (FMS-QA-031)', async () => {
    const res = await request(app)
      .post('/api/v1/payment/verify')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ paymentId });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.status).toBe('completed');
  });

  it('should reject refund by owner who does NOT own the court (FMS-QA-006)', async () => {
    const res = await request(app)
      .post(`/api/v1/payment/refund/${booking1._id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ reason: 'Owner refund attempt' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('should allow court owner to refund booking on their own court (FMS-QA-006, FMS-QA-035)', async () => {
    const res = await request(app)
      .post(`/api/v1/payment/refund/${booking1._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Customer requested refund' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.status).toBe('refunded');
    expect(res.body.payment.refundReason).toMatch(/court owner/i);
  });

  it('should reject duplicate refund attempts (FMS-QA-034)', async () => {
    const res = await request(app)
      .post(`/api/v1/payment/refund/${booking1._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Second refund' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already.*refunded/i);
  });
});

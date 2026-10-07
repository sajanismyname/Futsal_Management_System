const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const generateToken = require('../utils/generateToken');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

let ownerUser, otherOwner, adminUser, customerUser;
let ownerToken, otherOwnerToken, adminToken, _customerToken;
let testCourt;

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await Court.deleteMany({ courtName: /Test Court/i });
  await User.deleteMany({ email: /courttest/i });

  ownerUser = await User.create({
    name: 'Court Owner',
    email: 'courttestowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9801111111',
    isEmailVerified: true,
  });
  ownerToken = generateToken(ownerUser._id);

  otherOwner = await User.create({
    name: 'Other Owner',
    email: 'courttestother@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9802222222',
    isEmailVerified: true,
  });
  otherOwnerToken = generateToken(otherOwner._id);

  adminUser = await User.create({
    name: 'Admin User',
    email: 'courttestadmin@example.com',
    password: 'SecurePassword@123',
    role: 'admin',
    phone: '9803333333',
    isEmailVerified: true,
  });
  adminToken = generateToken(adminUser._id);

  customerUser = await User.create({
    name: 'Customer User',
    email: 'courttestcust@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9804444444',
    isEmailVerified: true,
  });
  _customerToken = generateToken(customerUser._id);
});

afterAll(async () => {
  await Court.deleteMany({ courtName: /Test Court/i });
  await User.deleteMany({ email: /courttest/i });
  await mongoose.connection.close();
});

describe('Courts API (FMS-QA-049 to FMS-QA-056)', () => {
  it('should allow owner to create a court (starts unapproved)', async () => {
    const res = await request(app)
      .post('/api/v1/courts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        courtName: 'Test Court Alpha',
        location: 'Kathmandu',
        price: 1500,
        courtType: '5A',
        operatingHours: JSON.stringify({ open: '06:00', close: '22:00' }),
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.court.isApproved).toBe(false);
    expect(res.body.court.approvalStatus).toBe('pending');
    testCourt = res.body.court;
  });

  it('should reject invalid operating hours (open >= close)', async () => {
    const res = await request(app)
      .post('/api/v1/courts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        courtName: 'Invalid Hours Court',
        location: 'Lalitpur',
        price: 1200,
        courtType: '5A',
        operatingHours: JSON.stringify({ open: '22:00', close: '06:00' }),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid operating hours/i);
  });

  it('should not expose unapproved court to public/customer (FMS-QA-052)', async () => {
    const res = await request(app).get(`/api/v1/courts/${testCourt._id}`);
    expect(res.statusCode).toBe(404);
  });

  it('should allow owner to view their unapproved court', async () => {
    const res = await request(app)
      .get(`/api/v1/courts/${testCourt._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.court._id).toBe(testCourt._id);
  });

  it('should allow admin to approve court', async () => {
    const res = await request(app)
      .patch(`/api/v1/courts/${testCourt._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isApproved: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.court.isApproved).toBe(true);
    expect(res.body.court.approvalStatus).toBe('approved');
  });

  it('should now expose approved court to public', async () => {
    const res = await request(app).get(`/api/v1/courts/${testCourt._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.court.courtName).toBe('Test Court Alpha');
  });

  it('should reject unauthorized owner updating court (FMS-QA-049)', async () => {
    const res = await request(app)
      .put(`/api/v1/courts/${testCourt._id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ courtName: 'Hacked Court' });

    expect(res.statusCode).toBe(403);
  });

  it('should prevent tampering with ownerId or approvalStatus via update (FMS-QA-049)', async () => {
    const res = await request(app)
      .put(`/api/v1/courts/${testCourt._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        courtName: 'Updated Court Alpha',
        ownerId: otherOwner._id,
        isApproved: true,
        approvalStatus: 'approved',
      });

    expect(res.statusCode).toBe(200);
    const updated = await Court.findById(testCourt._id);
    expect(updated.ownerId.toString()).toBe(ownerUser._id.toString());
  });

  it('should block deactivation if active future bookings exist (FMS-QA-051)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const booking = await Booking.create({
      userId: customerUser._id,
      courtId: testCourt._id,
      bookingDate: tomorrow,
      startTime: '07:00',
      endTime: '08:00',
      totalAmount: 1500,
      status: 'confirmed',
    });

    const res = await request(app)
      .delete(`/api/v1/courts/${testCourt._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot deactivate court with.*upcoming bookings/i);

    // Clean up test booking
    await Booking.deleteOne({ _id: booking._id });
  });

  it('should allow deactivation when no upcoming bookings exist', async () => {
    const res = await request(app)
      .delete(`/api/v1/courts/${testCourt._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    const deactivated = await Court.findById(testCourt._id);
    expect(deactivated.isActive).toBe(false);
  });
});

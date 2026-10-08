const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const Tournament = require('../models/Tournament');
const generateToken = require('../utils/generateToken');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

let adminUser, ownerUser, customerUser, otherAdmin;
let adminToken, _ownerToken, _customerToken;
let courtA, courtB;

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await User.deleteMany({ email: /ownertest/i });
  await Court.deleteMany({ courtName: /OwnerTest/i });
  await Booking.deleteMany({});
  await Tournament.deleteMany({ tournamentName: /OwnerTest/i });

  adminUser = await User.create({
    name: 'Admin OwnerTest',
    email: 'ownertestadmin@example.com',
    password: 'SecurePassword@123',
    role: 'admin',
    phone: '9801234500',
    isEmailVerified: true,
  });
  adminToken = generateToken(adminUser._id);

  otherAdmin = await User.create({
    name: 'Other Admin',
    email: 'ownertestotheradmin@example.com',
    password: 'SecurePassword@123',
    role: 'admin',
    phone: '9801234501',
    isEmailVerified: true,
  });

  customerUser = await User.create({
    name: 'Customer OwnerTest',
    email: 'ownertestcustomer@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9801234502',
    isEmailVerified: true,
  });
  _customerToken = generateToken(customerUser._id);
});

afterAll(async () => {
  await User.deleteMany({ email: /ownertest/i });
  await Court.deleteMany({ courtName: /OwnerTest/i });
  await Booking.deleteMany({});
  await Tournament.deleteMany({ tournamentName: /OwnerTest/i });
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({ email: 'ownertesttarget@example.com' });
  await Court.deleteMany({ courtName: /OwnerTest Target/i });
  await Booking.deleteMany({});
  await Tournament.deleteMany({ tournamentName: /OwnerTest/i });

  ownerUser = await User.create({
    name: 'Target Owner',
    email: 'ownertesttarget@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9801234599',
    isEmailVerified: true,
  });
  _ownerToken = generateToken(ownerUser._id);

  courtA = await Court.create({
    courtName: 'OwnerTest Target Court 1',
    ownerId: ownerUser._id,
    location: 'Kathmandu',
    price: 1500,
    courtType: '5A',
    operatingHours: { open: '06:00', close: '22:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });

  courtB = await Court.create({
    courtName: 'OwnerTest Target Court 2',
    ownerId: ownerUser._id,
    location: 'Lalitpur',
    price: 1800,
    courtType: '7A',
    operatingHours: { open: '07:00', close: '21:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });
});

describe('Owner Soft Deletion & Cascading Court Invisibility', () => {
  it('cannot delete another admin', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/users/${otherAdmin._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot delete another admin/i);
  });

  it('blocks owner deletion if active upcoming bookings exist on their courts', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await Booking.create({
      userId: customerUser._id,
      courtId: courtA._id,
      bookingDate: tomorrow,
      startTime: '08:00',
      endTime: '09:00',
      totalAmount: 1500,
      status: 'confirmed',
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${ownerUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot delete owner with 1 upcoming booking/i);

    // Verify owner and courts remain active
    const ownerCheck = await User.findById(ownerUser._id);
    expect(ownerCheck.isDeleted).toBe(false);

    const courtCheck = await Court.findById(courtA._id);
    expect(courtCheck.isActive).toBe(true);
  });

  it('blocks owner deletion if active upcoming tournaments exist', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    await Tournament.create({
      tournamentName: 'OwnerTest Active Tournament',
      ownerId: ownerUser._id,
      courtId: courtA._id,
      startDate: nextWeek,
      endDate: twoWeeks,
      maxTeams: 8,
      status: 'registration_open',
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${ownerUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot delete owner with 1 active tournament/i);
  });

  it('successfully deactivates owner, soft-deletes user, and hides all courts when no upcoming bookings exist', async () => {
    // Past booking (yesterday) to confirm audit trail preservation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const pastBooking = await Booking.create({
      userId: customerUser._id,
      courtId: courtA._id,
      bookingDate: yesterday,
      startTime: '10:00',
      endTime: '11:00',
      totalAmount: 1500,
      status: 'confirmed',
    });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${ownerUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/owner deactivated and all associated courts hidden/i);

    // 1. Verify owner soft delete in DB
    const deletedOwner = await User.findById(ownerUser._id);
    expect(deletedOwner.isDeleted).toBe(true);
    expect(deletedOwner.isSuspended).toBe(true);
    expect(deletedOwner.deletedAt).toBeDefined();

    // 2. Verify all owner's courts were marked isActive = false
    const courts = await Court.find({ ownerId: ownerUser._id });
    expect(courts.length).toBe(2);
    expect(courts.every((c) => c.isActive === false)).toBe(true);

    // 3. Verify public courts listing omits deactivated owner's courts
    const publicList = await request(app).get('/api/v1/courts');
    expect(publicList.statusCode).toBe(200);
    const listedIds = publicList.body.courts.map((c) => c._id.toString());
    expect(listedIds).not.toContain(courtA._id.toString());
    expect(listedIds).not.toContain(courtB._id.toString());

    // 4. Verify direct lookup returns 404 for regular users
    const courtDetail = await request(app).get(`/api/v1/courts/${courtA._id}`);
    expect(courtDetail.statusCode).toBe(404);
    expect(courtDetail.body.message).toMatch(/court not available/i);

    // 5. Verify customer's past booking remains intact with court reference
    const bookingInDb = await Booking.findById(pastBooking._id).populate('courtId');
    expect(bookingInDb).toBeDefined();
    expect(bookingInDb.courtId.courtName).toBe('OwnerTest Target Court 1');
  });

  it('suspends owner and hides courts, then restores approved courts upon unsuspend', async () => {
    // 1. Suspend owner
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${ownerUser._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(suspendRes.statusCode).toBe(200);
    expect(suspendRes.body.user.isSuspended).toBe(true);

    // Verify courts are deactivated
    const suspendedCourts = await Court.find({ ownerId: ownerUser._id });
    expect(suspendedCourts.every((c) => c.isActive === false)).toBe(true);

    // Verify public cannot see court
    const publicCourt = await request(app).get(`/api/v1/courts/${courtA._id}`);
    expect(publicCourt.statusCode).toBe(404);

    // 2. Unsuspend owner
    const unsuspendRes = await request(app)
      .patch(`/api/v1/admin/users/${ownerUser._id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unsuspendRes.statusCode).toBe(200);
    expect(unsuspendRes.body.user.isSuspended).toBe(false);

    // Verify approved courts are restored to active
    const restoredCourts = await Court.find({ ownerId: ownerUser._id });
    expect(restoredCourts.every((c) => c.isActive === true)).toBe(true);

    // Verify public can see court again
    const publicRestored = await request(app).get(`/api/v1/courts/${courtA._id}`);
    expect(publicRestored.statusCode).toBe(200);
    expect(publicRestored.body.court.courtName).toBe('OwnerTest Target Court 1');
  });
});

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Court = require('../models/Court');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const generateToken = require('../utils/generateToken');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

let ownerUser, otherOwner, customerUser;
let ownerToken, _otherOwnerToken, customerToken;
let ownerCourt, otherCourt;
let testTournament;
let team1, team2;

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
  await Tournament.deleteMany({});
  await Team.deleteMany({});
  await Court.deleteMany({ courtName: /Tourney Test Court/i });
  await User.deleteMany({ email: /tourneytest/i });

  ownerUser = await User.create({
    name: 'Tourney Owner',
    email: 'tourneytestowner@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9803344551',
    isEmailVerified: true,
  });
  ownerToken = generateToken(ownerUser._id);

  otherOwner = await User.create({
    name: 'Other Tourney Owner',
    email: 'tourneytestother@example.com',
    password: 'SecurePassword@123',
    role: 'owner',
    phone: '9803344552',
    isEmailVerified: true,
  });
  _otherOwnerToken = generateToken(otherOwner._id);

  customerUser = await User.create({
    name: 'Tourney Customer',
    email: 'tourneytestcust@example.com',
    password: 'SecurePassword@123',
    role: 'customer',
    phone: '9803344553',
    isEmailVerified: true,
  });
  customerToken = generateToken(customerUser._id);

  ownerCourt = await Court.create({
    courtName: 'Tourney Test Court 1',
    ownerId: ownerUser._id,
    location: 'Kathmandu',
    price: 1500,
    courtType: '7A',
    operatingHours: { open: '06:00', close: '22:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });

  otherCourt = await Court.create({
    courtName: 'Tourney Test Court 2',
    ownerId: otherOwner._id,
    location: 'Pokhara',
    price: 1200,
    courtType: '5A',
    operatingHours: { open: '06:00', close: '22:00' },
    isApproved: true,
    approvalStatus: 'approved',
    isActive: true,
  });

  team1 = await Team.create({
    teamName: 'Tourney Tigers',
    captainId: customerUser._id,
    members: [customerUser._id],
  });

  team2 = await Team.create({
    teamName: 'Tourney Lions',
    captainId: customerUser._id,
    members: [customerUser._id],
  });
});

afterAll(async () => {
  await Tournament.deleteMany({});
  await Team.deleteMany({});
  await Court.deleteMany({ courtName: /Tourney Test Court/i });
  await User.deleteMany({ email: /tourneytest/i });
  await mongoose.connection.close();
});

describe('Tournaments API (FMS-QA-037 to 048, FMS-QA-083)', () => {
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 7);
  const futureStartStr = futureStart.toISOString().split('T')[0];

  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 10);
  const futureEndStr = futureEnd.toISOString().split('T')[0];

  it('should reject tournament creation with another owner court (FMS-QA-037)', async () => {
    const res = await request(app)
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tournamentName: 'Unauthorized Venue Tourney',
        courtId: otherCourt._id,
        startDate: futureStartStr,
        endDate: futureEndStr,
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/only host tournaments at courts you own/i);
  });

  it('should reject tournament creation with startDate >= endDate (FMS-QA-044)', async () => {
    const res = await request(app)
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tournamentName: 'Invalid Dates Tourney',
        courtId: ownerCourt._id,
        startDate: futureEndStr,
        endDate: futureStartStr,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/start date must be before end date/i);
  });

  it('should create valid tournament', async () => {
    const res = await request(app)
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        tournamentName: 'Championship Cup 2026',
        courtId: ownerCourt._id,
        startDate: futureStartStr,
        endDate: futureEndStr,
        registrationDeadline: futureStartStr,
        maxTeams: 4,
        format: 'knockout',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.tournament.status).toBe('upcoming');
    expect(res.body.tournament.format).toBe('knockout');
    testTournament = res.body.tournament;
  });

  it('should register team and prevent duplicate registration (FMS-QA-041)', async () => {
    const res = await request(app)
      .post(`/api/v1/tournaments/${testTournament._id}/register`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ teamId: team1._id });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Duplicate registration attempt
    const resDup = await request(app)
      .post(`/api/v1/tournaments/${testTournament._id}/register`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ teamId: team1._id });

    expect(resDup.statusCode).toBe(400);
    expect(resDup.body.message).toMatch(/already registered/i);
  });

  it('should generate knockout fixtures (FMS-QA-038, FMS-QA-046)', async () => {
    // Register second team
    await request(app)
      .post(`/api/v1/tournaments/${testTournament._id}/register`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ teamId: team2._id });

    const res = await request(app)
      .post(`/api/v1/tournaments/${testTournament._id}/fixtures`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.fixtures.length).toBeGreaterThanOrEqual(1);
    expect(res.body.tournament.status).toBe('ongoing');
  });

  it('should prevent duplicate fixture generation (FMS-QA-045)', async () => {
    const res = await request(app)
      .post(`/api/v1/tournaments/${testTournament._id}/fixtures`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already.*generated/i);
  });

  it('should validate scores as non-negative integers (FMS-QA-047)', async () => {
    const resInvalid = await request(app)
      .put(`/api/v1/tournaments/${testTournament._id}/scores`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fixtureIndex: 0, scoreA: -1, scoreB: 2 });

    expect(resInvalid.statusCode).toBe(400);

    const resValid = await request(app)
      .put(`/api/v1/tournaments/${testTournament._id}/scores`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fixtureIndex: 0, scoreA: 2, scoreB: 1 });

    expect(resValid.statusCode).toBe(200);
    expect(resValid.body.fixtures[0].scoreA).toBe(2);
    expect(resValid.body.fixtures[0].status).toBe('completed');
  });

  it('should support team membership management (FMS-QA-083)', async () => {
    // Add member
    const resAdd = await request(app)
      .post(`/api/v1/tournaments/teams/${team1._id}/members`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ email: otherOwner.email });

    expect(resAdd.statusCode).toBe(200);

    // Remove member
    const resRemove = await request(app)
      .delete(`/api/v1/tournaments/teams/${team1._id}/members/${otherOwner._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(resRemove.statusCode).toBe(200);
  });
});

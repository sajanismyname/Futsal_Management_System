const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/futsal_test');
});

afterAll(async () => {
  await User.deleteMany({ email: /testauth/i });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test Auth User',
    email: 'testauth@example.com',
    password: 'testpass123',
    role: 'customer',
    phone: '9801234567',
  };

  let verificationToken;

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and require email verification', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeUndefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user.isEmailVerified).toBe(false);

      const user = await User.findOne({ email: testUser.email }).select('+emailVerificationToken');
      verificationToken = user.emailVerificationToken;
      expect(verificationToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, email: 'notanemail' });
      expect(res.statusCode).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, email: 'new@test.com', password: '123' });
      expect(res.statusCode).toBe(400);
    });

    it('should reject invalid phone number', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ ...testUser, email: 'phone@test.com', phone: '8812345678' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/auth/verify-email/:token', () => {
    it('should verify email with valid token', async () => {
      const res = await request(app).get(`/api/v1/auth/verify-email/${verificationToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verification successful/i);
    });

    it('should return success when verification link is used again', async () => {
      const res = await request(app).get(`/api/v1/auth/verify-email/${verificationToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verification successful/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials after verification', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: 'wrongpass' });
      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@test.com', password: 'pass123' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;
    beforeAll(async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
      token = res.body.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
    });
  });
});

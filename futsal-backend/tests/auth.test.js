const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
});

afterAll(async () => {
  await User.deleteMany({ email: /testauth/i });
  await mongoose.connection.close();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test Auth User',
    email: 'testauth@example.com',
    password: 'Secure@12',
    role: 'customer',
    phone: '9801234567',
  };

  let rawVerificationToken;

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and require email verification', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeUndefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user.isEmailVerified).toBe(false);

      rawVerificationToken = res.body.testVerificationToken;
      expect(rawVerificationToken).toBeDefined();

      const user = await User.findOne({ email: testUser.email }).select('+emailVerificationToken');
      expect(user.emailVerificationToken).toBeDefined();
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
    it('should verify email with valid token and clear token fields', async () => {
      const res = await request(app).get(`/api/v1/auth/verify-email/${rawVerificationToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verification successful/i);

      // Verify token fields are cleared (FMS-QA-010)
      const user = await User.findOne({ email: testUser.email }).select('+emailVerificationToken +emailVerificationExpires');
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.emailVerificationExpires).toBeUndefined();
    });

    it('should reject when verification link is reused (one-time token)', async () => {
      const res = await request(app).get(`/api/v1/auth/verify-email/${rawVerificationToken}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject nonexistent or malformed token', async () => {
      const res = await request(app).get('/api/v1/auth/verify-email/nonexistenttokendata123');
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should return identical generic message without leaking account existence (FMS-QA-012)', async () => {
      const res1 = await request(app).post('/api/v1/auth/resend-verification').send({ email: testUser.email });
      expect(res1.statusCode).toBe(200);
      expect(res1.body.message).toMatch(/if an account exists/i);

      const res2 = await request(app).post('/api/v1/auth/resend-verification').send({ email: 'nonexistentuser@example.com' });
      expect(res2.statusCode).toBe(200);
      expect(res2.body.message).toBe(res1.body.message);
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

  describe('GET /api/v1/auth/me and Session Invalidation', () => {
    let token;
    beforeAll(async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
      token = res.body.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should invalidate token after password change (FMS-QA-014)', async () => {
      const newPassword = 'NewSecurePassword@123';
      const changeRes = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: testUser.password, newPassword });
      expect(changeRes.statusCode).toBe(200);

      // Old token should now be rejected
      const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(meRes.statusCode).toBe(401);
      expect(meRes.body.message).toMatch(/session expired/i);

      // Re-login with new password works
      const loginRes = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: newPassword });
      expect(loginRes.statusCode).toBe(200);
    });
  });
});

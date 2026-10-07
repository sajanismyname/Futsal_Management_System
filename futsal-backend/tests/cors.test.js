const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

const MONGO_TEST_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/futsal_test';

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('CORS and Route Aliases Verification', () => {
  const vercelOrigin = 'https://futsal-management-system.vercel.app';
  const vercelPreviewOrigin = 'https://futsal-management-system-git-dev.vercel.app';
  const disallowedOrigin = 'https://malicious-site.example.com';

  test('OPTIONS preflight on /auth/login allows Vercel origin', async () => {
    const res = await request(app)
      .options('/auth/login')
      .set('Origin', vercelOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(vercelOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('OPTIONS preflight on /api/v1/auth/login allows Vercel preview origin', async () => {
    const res = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', vercelPreviewOrigin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(vercelPreviewOrigin);
  });

  test('POST /auth/login (root alias) reaches auth handler and includes CORS headers', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Origin', vercelOrigin)
      .send({ email: 'invalid@example.com', password: 'wrong' });

    expect(res.headers['access-control-allow-origin']).toBe(vercelOrigin);
    // Should NOT be 404 Not Found!
    expect(res.status).not.toBe(404);
  });

  test('GET /health includes CORS header for allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', vercelOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(vercelOrigin);
  });

  test('Disallowed origin is blocked by CORS', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Origin', disallowedOrigin)
      .send({ email: 'test@example.com', password: 'test' });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

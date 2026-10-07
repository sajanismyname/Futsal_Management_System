require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const courtRoutes = require('./routes/courtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Clean and normalize URLs by trimming and removing trailing slashes
const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

// Restrict CORS to configured frontend URLs (FMS-QA-007)
const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  'https://futsal-management-system.vercel.app',
  'https://futsal-management-system.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const clean = normalizeOrigin(origin);
  if (allowedOrigins.includes(clean)) return true;
  // Match any Vercel preview or production deployments
  if (/^https:\/\/futsal-management-system.*\.vercel\.app$/.test(clean)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(clean)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, tests, server-to-server)
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Bounded JSON body parser (FMS-QA-095)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General rate limiter - skipped in test mode (FMS-QA-096)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later' },
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(['/api/', '/api/v1/'], generalLimiter);

// Auth endpoints rate limiter (FMS-QA-096)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(['/api/v1/auth/login', '/api/auth/login', '/auth/login'], authLimiter);
app.use(['/api/v1/auth/register', '/api/auth/register', '/auth/register'], authLimiter);

// Payment endpoints rate limiter (FMS-QA-096)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many payment requests, please try again later' },
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(['/api/v1/payment/initiate', '/api/payment/initiate', '/payment/initiate'], paymentLimiter);
app.use(['/api/v1/payment/verify', '/api/payment/verify', '/payment/verify'], paymentLimiter);
app.use(['/api/v1/payment/refund', '/api/payment/refund', '/payment/refund'], paymentLimiter);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Futsal Management API is running', timestamp: new Date() });
});

// Primary API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courts', courtRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Backward-compatibility aliases for frontend deployments calling /api/* or /* directly
app.use('/api/auth', authRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/auth', authRoutes);
app.use('/courts', courtRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payment', paymentRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

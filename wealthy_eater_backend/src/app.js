/**
 * app.js — Express application factory.
 *
 * Configures middleware stack, CORS, security headers, rate limiting,
 * and mounts all API routes.
 *
 * server.js is responsible for connecting to the database and calling listen().
 * This separation means app.js can be imported cleanly by test frameworks.
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes');

const app = express();

// ── Security Headers (helmet) ─────────────────────────────────────────────────
// Sets Content-Security-Policy, X-Frame-Options, X-XSS-Protection, etc.
app.use(helmet());

// ── HTTP Request Logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}


// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));   // reject oversized JSON payloads
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin: curl, mobile native, Postman, server-to-server
      if (!origin) return callback(null, true);

      // Allow any localhost / 127.0.0.1 during development
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }

      // Allow Android emulator host
      if (origin === 'http://10.0.2.2:5000') return callback(null, true);

      // Allow explicitly whitelisted origins from env
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS policy blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

// ── Rate Limiting ──────────────────────────────────────────────────────────────

// Strict limit for auth endpoints — prevents brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15-minute window
  max: 20,                      // max 20 auth requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1-minute window
  max: 120,               // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Wealthy Eater API is running' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(routes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must have 4 parameters for Express to treat it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Log all server errors
  if (!err.isOperational || (err.statusCode ?? 500) >= 500) {
    console.error('[Unhandled Error]', err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational
    ? err.message
    : 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    // Include stack trace only in development for debugging
    ...(isDev && { stack: err.stack }),
  });
});

module.exports = app;

const jwt = require('jsonwebtoken');

// Single source of truth for JWT secrets.
// Both jwt.js utilities AND auth.js middleware import from here.
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// C-07: Fail fast at startup if secrets are not configured.
// This prevents the server from silently using a known-public fallback secret
// in a misconfigured production deployment.
if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    'FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables. ' +
    'Server startup aborted to prevent insecure operation.'
  );
}

const ACCESS_TOKEN_EXPIRY  = process.env.JWT_ACCESS_EXPIRATION  || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRATION || '7d';

/**
 * Signs a short-lived access token.
 * @param {object} payload - Data to encode (sub, email, role).
 * @param {string} [expiresIn] - Override default expiry (e.g. '1h').
 */
function signAccessToken(payload, expiresIn = ACCESS_TOKEN_EXPIRY) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn });
}

/**
 * Signs a long-lived refresh token.
 * @param {object} payload - Minimal data (sub only is sufficient).
 */
function signRefreshToken(payload, expiresIn = REFRESH_TOKEN_EXPIRY) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
}

/**
 * Verifies an access token and returns the decoded payload.
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 * @param {string} token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * @param {string} token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

// Keep old export name for backward compat
const verifyToken = verifyAccessToken;

module.exports = {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,          // legacy alias
};

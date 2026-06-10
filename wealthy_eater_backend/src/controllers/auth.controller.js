const AuthService = require('../services/auth.service');
const RegistrationService = require('../services/registration.service');

// ─── Shared response helper ──────────────────────────────────────────────────

function handleError(err, res) {
  const status = err.statusCode || err.status || 500;
  const message = err.isOperational
    ? err.message
    : 'An unexpected error occurred. Please try again later.';
  return res.status(status).json({ success: false, message });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Email and password must be valid strings' });
    }
    const targetRole = (typeof role === 'string' && role) ? role : 'customer';
    const result = await AuthService.login(email, password, targetRole);
    return res.json({ success: true, message: 'Login successful', data: result });
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * POST /api/auth/google
 * Body: { idToken }
 */
async function googleLogin(req, res) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }
    const result = await AuthService.googleLogin(idToken);
    return res.json({ success: true, message: 'Google login successful', data: result });
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns a new accessToken without requiring re-login.
 */
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }
    const result = await AuthService.refresh(refreshToken);
    return res.json({ success: true, message: 'Token refreshed', data: result });
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * GET /api/auth/me
 * Requires: authenticateToken middleware
 * Returns: current user profile based on JWT payload.
 * Used by mobile app to restore session on launch.
 */
async function getMe(req, res) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const user = await AuthService.getMe(userId);
    return res.json({ success: true, data: user });
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
async function register(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const result = await RegistrationService.startRegistration(email, password);
    return res.json(result);
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    const result = await RegistrationService.verifyOtp(email, otp);
    return res.json(result);
  } catch (err) {
    return handleError(err, res);
  }
}

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
async function resendOtp(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const result = await RegistrationService.resendOtp(email);
    return res.json(result);
  } catch (err) {
    return handleError(err, res);
  }
}

module.exports = { login, googleLogin, refresh, getMe, register, verifyOtp, resendOtp };

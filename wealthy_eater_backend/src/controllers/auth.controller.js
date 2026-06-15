const AuthService = require('../services/auth.service');
const RegistrationService = require('../services/registration.service');
const AppError = require('../utils/AppError');

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Email and password must be valid strings', 400, 'VALIDATION_ERROR');
    }
    if (password.length > 128) {
      throw new AppError('Password is too long', 400, 'VALIDATION_ERROR');
    }
    const cleanEmail = email.trim().toLowerCase();
    const targetRole = (typeof role === 'string' && role) ? role : 'customer';
    const result = await AuthService.login(cleanEmail, password, targetRole);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/google
 * Body: { idToken }
 */
async function googleLogin(req, res, next) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      throw new AppError('idToken is required', 400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.googleLogin(idToken);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 * Returns a new accessToken without requiring re-login.
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw new AppError('refreshToken is required', 400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.refresh(refreshToken);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Requires: authenticateToken middleware
 * Returns: current user profile based on JWT payload.
 * Used by mobile app to restore session on launch.
 */
async function getMe(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const user = await AuthService.getMe(userId);
    return res.json({ success: true, data: user, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/register
 * Body: { email, password }
 */
async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 6 || password.length > 128) {
      throw new AppError('Password must be between 6 and 128 characters', 400, 'VALIDATION_ERROR');
    }
    const cleanEmail = email.trim().toLowerCase();
    const result = await RegistrationService.startRegistration(cleanEmail, password);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      throw new AppError('Email and OTP are required', 400, 'VALIDATION_ERROR');
    }
    const result = await RegistrationService.verifyOtp(email, otp);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Body: { email }
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) {
      throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
    }
    const result = await RegistrationService.resendOtp(email);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, googleLogin, refresh, getMe, register, verifyOtp, resendOtp };

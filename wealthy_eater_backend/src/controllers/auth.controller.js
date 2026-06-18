const AuthService = require('../services/auth.service');
const RegistrationService = require('../services/registration.service');
const AppError = require('../utils/AppError');

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { identifier, email, password, role }
 */
async function login(req, res, next) {
  try {
    const { identifier, email, password, role } = req.body || {};
    const targetId = identifier || email;
    if (!targetId || !password || typeof targetId !== 'string' || typeof password !== 'string') {
      throw new AppError('Identifier and password must be valid strings', 400, 'VALIDATION_ERROR');
    }
    if (password.length > 128) {
      throw new AppError('Password is too long', 400, 'VALIDATION_ERROR');
    }
    const targetRole = typeof role === "string" && role ? role : "customer";
    const result = await AuthService.login(targetId, password, targetRole);
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
 * Body: { identifier, email, password, role }
 */
async function register(req, res, next) {
  try {
    const { identifier, email, password, role } = req.body || {};
    const targetId = identifier || email;
    if (!targetId || !password || typeof targetId !== 'string' || typeof password !== 'string') {
      throw new AppError('Identifier and password are required', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 6 || password.length > 128) {
      throw new AppError('Password must be between 6 and 128 characters', 400, 'VALIDATION_ERROR');
    }
    const result = await RegistrationService.startRegistration(targetId, password, role);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Body: { identifier, email, otp }
 */
async function verifyOtp(req, res, next) {
  try {
    const { identifier, email, otp } = req.body || {};
    const targetId = identifier || email;
    if (!targetId || !otp) {
      throw new AppError('Identifier and OTP are required', 400, 'VALIDATION_ERROR');
    }
    const result = await RegistrationService.verifyOtp(targetId, otp);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Body: { identifier, email }
 */
async function resendOtp(req, res, next) {
  try {
    const { identifier, email } = req.body || {};
    const targetId = identifier || email;
    if (!targetId) {
      throw new AppError('Identifier is required', 400, 'VALIDATION_ERROR');
    }
    const result = await RegistrationService.resendOtp(targetId);
    return res.json({ success: true, data: result.data || result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 * Requires authentication
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      throw new AppError('Current password and new password are required', 400, 'VALIDATION_ERROR');
    }
    const result = await AuthService.changePassword(userId, oldPassword, newPassword);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/link-email
 * Body: { email }
 * Requires authentication
 */
async function linkEmail(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const { email } = req.body || {};
    const result = await AuthService.linkEmail(userId, email);
    return res.json({ success: true, data: result, error: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  googleLogin,
  refresh,
  getMe,
  register,
  verifyOtp,
  resendOtp,
  changePassword,
  linkEmail,
};

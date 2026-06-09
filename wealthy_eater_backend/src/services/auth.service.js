const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const UserRepository = require('../repositories/user.repository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// ─── Helper ──────────────────────────────────────────────────────────────────

/** Builds the standardised user response object sent to clients. */
function formatUser(user) {
  return {
    id:    user._id.toString(),
    email: user.email,
    role:  user.role,
  };
}

/** Issues both access and refresh tokens for a user. */
function issueTokens(user) {
  const payload = {
    sub:   user._id.toString(),
    email: user.email,
    role:  user.role,
  };
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: user._id.toString() }),
    user:         formatUser(user),
  };
}

// ─── AuthService ─────────────────────────────────────────────────────────────

class AuthService {
  // ── Email / Password Login ─────────────────────────────────────────────────

  static async login(email, password, requiredRole = 'customer') {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await UserRepository.findByEmail(email.toLowerCase().trim());
    if (!user) {
      // Generic message to prevent user enumeration
      throw new AppError('Invalid email or password', 401);
    }

    const hash = user.password_hash;
    if (!hash) {
      throw new AppError('This account does not have a password. Please contact support.', 400);
    }

    const matched = await bcrypt.compare(password, hash);
    if (!matched) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.role !== requiredRole) {
      throw new AppError(`Access denied: account is not a ${requiredRole}`, 403);
    }

    return issueTokens(user);
  }

  // ── Google Sign-In ─────────────────────────────────────────────────────────

  static async googleLogin(idToken) {
    if (!GOOGLE_CLIENT_ID) {
      throw new AppError('Google login is not configured on this server', 500);
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    let googlePayload;

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } catch {
      throw new AppError('Invalid or expired Google ID token', 401);
    }

    const { email } = googlePayload;

    if (!email) {
      throw new AppError('Google account does not have an email address', 400);
    }

    let user = await UserRepository.findByEmail(email.toLowerCase());

    if (!user) {
      // Auto-register with only the fields allowed by schema
      user = await UserRepository.create({
        email: email.toLowerCase(),
        role:  'customer',
        // password_hash left null — Google-only account
      });
    } else {
      if (user.role !== 'customer') {
        throw new AppError('Access denied: Google login is only available for customer accounts', 403);
      }
    }

    return issueTokens(user);
  }

  // ── Refresh Access Token ────────────────────────────────────────────────────

  static async refresh(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await UserRepository.findById(payload.sub);
    if (!user || !user.is_active) {
      throw new AppError('User not found or account deactivated', 401);
    }

    return {
      accessToken: signAccessToken({
        sub:   user._id.toString(),
        email: user.email,
        role:  user.role,
      }),
    };
  }

  // ── Get Current User ────────────────────────────────────────────────────────

  static async getMe(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return formatUser(user);
  }
}

module.exports = AuthService;

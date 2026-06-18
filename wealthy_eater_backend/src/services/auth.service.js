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
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };
}

/** Issues both access and refresh tokens for a user. */
function issueTokens(user) {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: user._id.toString() }),
    user: formatUser(user),
  };
}

// ─── AuthService ─────────────────────────────────────────────────────────────

class AuthService {
  // ── Change Password (Authenticated) ────────────────────────────────────────

  static async changePassword(userId, oldPassword, newPassword) {
    if (!userId || !oldPassword || !newPassword) {
      throw new AppError('All fields are required', 400, 'VALIDATION_ERROR');
    }
    if (newPassword.length < 6 || newPassword.length > 128) {
      throw new AppError('New password must be between 6 and 128 characters', 400, 'VALIDATION_ERROR');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const hash = user.password_hash;
    if (!hash) {
      throw new AppError('This account does not have a password set', 400, 'VALIDATION_ERROR');
    }

    const matched = await bcrypt.compare(oldPassword, hash);
    if (!matched) {
      throw new AppError('Incorrect current password', 400, 'VALIDATION_ERROR');
    }

    if (oldPassword === newPassword) {
      throw new AppError('New password cannot be the same as current password', 400, 'VALIDATION_ERROR');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newHash;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    return { success: true, message: 'Password changed successfully' };
  }

  // ── Email / Password Login ─────────────────────────────────────────────────

  static async login(identifier, password, requiredRole = 'customer') {
    if (!identifier || !password) {
      throw new AppError('Identifier and password are required', 400);
    }

    const cleanId = identifier.trim();
    const emailRegex = /^[^@]+@[^@]+\.[^@]+/;
    const isEmail = emailRegex.test(cleanId);

    let user;
    if (isEmail) {
      user = await UserRepository.findByEmail(cleanId.toLowerCase());
    } else {
      const User = require('../models/User');
      user = await User.findOne({ phone: cleanId }).exec();
    }

    if (!user) {
      // Generic message to prevent user enumeration
      throw new AppError('Invalid credentials', 401);
    }

    if (user.is_active === false) {
      throw new AppError('Account is not verified. Please verify your account before logging in.', 401, 'UNVERIFIED_ACCOUNT');
    }

    const hash = user.password_hash;
    if (!hash) {
      throw new AppError('This account does not have a password. Please contact support.', 400);
    }

    const matched = await bcrypt.compare(password, hash);
    if (!matched) {
      throw new AppError('Invalid credentials', 401);
    }

    if (user.role !== requiredRole) {
      throw new AppError(`Access denied: account is not a ${requiredRole}`, 403);
    }

    if (user.role === 'nutritionist') {
      const Nutritionist = require('../models/Nutritionist');
      const existing = await Nutritionist.findOne({ user_id: user._id.toString() }).exec();
      if (!existing) {
        await Nutritionist.create({
          user_id: user._id.toString(),
          full_name: user.email ? user.email.split('@')[0] : (user.phone ? user.phone : 'Nutritionist'),
          specialization: 'Nutritionist',
          professional_title: 'Nutritionist',
          service_fee: 100000,
          approval_status: 'approval',
          average_rating: 5.0,
        });
      }
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
        role: 'customer',
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
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      }),
    };
  }

  // ── Get Current User ────────────────────────────────────────────────────────

  static async getMe(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return formatUser(user);
  }

  static async linkEmail(userId, email) {
    if (!userId || !email) {
      throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
    }
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^@]+@[^@]+\.[^@]+/;
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError('Invalid email format', 400, 'VALIDATION_ERROR');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const User = require('../models/User');
    const existing = await User.findOne({ email: cleanEmail }).exec();
    if (existing && existing._id.toString() !== userId) {
      throw new AppError('This email is already in use by another account', 409, 'ALREADY_REGISTERED');
    }

    user.email = cleanEmail;
    await user.save();

    return formatUser(user);
  }
}

module.exports = AuthService;

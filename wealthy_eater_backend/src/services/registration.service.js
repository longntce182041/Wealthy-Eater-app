const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/mail');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

const OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes as requested
const RESEND_WAIT_MS = 60 * 1000; // 60 seconds
const MAX_RESEND_PER_HOUR = 5;
const MAX_INCORRECT_ATTEMPTS = 3;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendSMSViaFirebase(phone, otp) {
  // SECURITY: Never log the OTP in plaintext — it would leak into log aggregators.
  // Log only the masked phone for traceability in development.
  const maskedPhone = phone.length > 4
    ? phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
    : '****';
  console.log(`[Firebase SMS Mock] OTP sent to ${maskedPhone}`);
  return Promise.resolve();
}

async function ensureNutritionistProfile(user) {
  // NOTE: This function is intentionally a no-op after the C-10 security fix.
  // Nutritionist profiles must ONLY be created through the explicit admin-gated
  // POST /api/nutritionists/register flow, never silently on login.
  // Keeping the function signature so callers don't need to change.
}

class RegistrationService {
  static async startRegistration(identifier, password, role = 'customer') {
    if (!identifier || !password) {
      throw new AppError('Identifier and password are required', 400, 'VALIDATION_ERROR');
    }

    const cleanId = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(cleanId);

    const email = isEmail ? cleanId.toLowerCase() : null;
    const phone = !isEmail ? cleanId : null;

    // Check if active user already exists
    const existing = await User.findOne(isEmail ? { email } : { phone }).exec();
    if (existing) {
      if (existing.is_active) {
        throw new AppError(
          isEmail ? 'This email is already registered' : 'This phone number is already registered',
          409,
          'ALREADY_REGISTERED'
        );
      }

      // Prevent duplicate pending registration resends within the throttle window
      const now = Date.now();
      if (existing.otp_expires_at && existing.otp_expires_at.getTime() > now) {
        throw new AppError(
          'A verification code has already been sent. Please check your messages or request a new code later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }
    }

    // Hash password and OTP
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    let user = existing;
    if (!user) {
      user = new User({
        email,
        phone,
        password_hash: passwordHash,
        role: role || 'customer',
        is_active: false,
        otp_code: otpHash,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        otp_resend_count: 0,
        otp_last_sent_at: new Date(),
      });
    } else {
      // Update pending user details
      user.password_hash = passwordHash;
      user.role = role || 'customer';
      user.otp_code = otpHash;
      user.otp_expires_at = expiresAt;
      user.otp_attempts = 0;
      user.otp_last_sent_at = new Date();
    }
    await user.save();

    // Send code
    if (isEmail) {
      await sendVerificationEmail({ to: email, otp, ttlMinutes: 3 });
    } else {
      await sendSMSViaFirebase(phone, otp);
    }

    return { success: true, message: 'Verification code sent' };
  }

  static async verifyOtp(identifier, otp) {
    if (!identifier || !otp) {
      throw new AppError('Identifier and OTP are required', 400, 'VALIDATION_ERROR');
    }

    const cleanId = identifier.trim();
    const emailRegex = /^[^@]+@[^@]+\.[^@]+/;
    const isEmail = emailRegex.test(cleanId);

    const email = isEmail ? cleanId.toLowerCase() : null;
    const phone = !isEmail ? cleanId : null;

    const user = await User.findOne(isEmail ? { email } : { phone }).exec();

    // Duplicate check fallback
    if (!user) {
      throw new AppError('No pending registration found', 404, 'NOT_FOUND');
    }

    if (user.is_active) {
      await ensureNutritionistProfile(user);
      // If user is already verified (e.g. double click), issue tokens immediately
      const payload = { sub: user._id.toString(), email: user.email, phone: user.phone, role: user.role };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken({ sub: user._id.toString() });
      return {
        success: true,
        message: 'Account already verified',
        data: {
          accessToken,
          refreshToken,
          user: { id: user._id.toString(), email: user.email, phone: user.phone, role: user.role },
        },
      };
    }

    // Check attempts limit
    if ((user.otp_attempts || 0) >= MAX_INCORRECT_ATTEMPTS) {
      await user.deleteOne();
      throw new AppError('Maximum verification attempts exceeded. Please register again.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Check expiry
    if (!user.otp_expires_at || user.otp_expires_at.getTime() < Date.now()) {
      await user.deleteOne();
      throw new AppError('Verification code has expired. Please register again.', 410, 'CODE_EXPIRED');
    }

    const match = await bcrypt.compare(otp, user.otp_code);
    if (!match) {
      user.otp_attempts = (user.otp_attempts || 0) + 1;
      await user.save();
      throw new AppError('Invalid verification code', 400, 'VALIDATION_ERROR');
    }

    // Successfully verified
    user.is_active = true;
    user.otp_code = null;
    user.otp_expires_at = null;
    user.otp_attempts = 0;
    user.otp_resend_count = 0;
    await user.save();

    await ensureNutritionistProfile(user);

    // Issue tokens
    const payload = { sub: user._id.toString(), email: user.email, phone: user.phone, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ sub: user._id.toString() });

    return {
      success: true,
      message: 'Account verified successfully',
      data: {
        accessToken,
        refreshToken,
        user: { id: user._id.toString(), email: user.email, phone: user.phone, role: user.role },
      },
    };
  }

  static async resendOtp(identifier) {
    if (!identifier) {
      throw new AppError('Identifier is required', 400, 'VALIDATION_ERROR');
    }

    const cleanId = identifier.trim();
    const emailRegex = /^[^@]+@[^@]+\.[^@]+/;
    const isEmail = emailRegex.test(cleanId);

    const email = isEmail ? cleanId.toLowerCase() : null;
    const phone = !isEmail ? cleanId : null;

    const user = await User.findOne(isEmail ? { email } : { phone }).exec();
    if (!user || user.is_active) {
      throw new AppError('No pending registration found', 404, 'NOT_FOUND');
    }

    const now = Date.now();
    // Check wait time
    if (user.otp_last_sent_at && user.otp_last_sent_at.getTime() + RESEND_WAIT_MS > now) {
      throw new AppError('Please wait before requesting a new code', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Reset hourly/session counter if last sent older than 1 hour
    let resendCount = user.otp_resend_count || 0;
    if (user.otp_last_sent_at && (now - user.otp_last_sent_at.getTime()) > 60 * 60 * 1000) {
      resendCount = 0;
    }
    if (resendCount >= MAX_RESEND_PER_HOUR) {
      throw new AppError('Resend limit exceeded. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    user.otp_code = otpHash;
    user.otp_expires_at = expiresAt;
    user.otp_resend_count = resendCount + 1;
    user.otp_last_sent_at = new Date();
    user.otp_attempts = 0;
    await user.save();

    // Send code
    if (isEmail) {
      await sendVerificationEmail({ to: email, otp, ttlMinutes: 3 });
    } else {
      await sendSMSViaFirebase(phone, otp);
    }

    return { success: true, message: 'Verification code resent' };
  }
}

module.exports = RegistrationService;

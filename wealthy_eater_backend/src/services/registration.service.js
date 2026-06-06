const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const RegistrationRepo = require('../repositories/registration.repository');
const UserRepo = require('../repositories/user.repository');
const { sendVerificationEmail } = require('../utils/mail');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_WAIT_MS = 60 * 1000; // 60 seconds
const MAX_RESEND_PER_HOUR = 5;
const MAX_INCORRECT_ATTEMPTS = 3;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

class RegistrationService {
  static async startRegistration(email, password) {
    if (!email || !password) throw new AppError('Email and password required', 400);
    const cleanEmail = email.toLowerCase().trim();

    // Check user already exists
    const existing = await UserRepo.findByEmail(cleanEmail);
    if (existing) throw new AppError('This email is already registered', 409);

    // Prevent duplicate pending registration: if existing pending and not expired, return info
    const pending = await RegistrationRepo.findByEmail(cleanEmail);
    if (pending) {
      const now = Date.now();
      if (pending.expires_at && pending.expires_at.getTime() > now) {
        // allow resending but enforce wait/resend limits via resend endpoint
        throw new AppError('A verification code has already been sent. Please check your email or request a new code after some time.', 429);
      }
    }

    // Hash password and OTP
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Store registration record (overwrite any existing)
    await RegistrationRepo.deleteByEmail(cleanEmail);
    await RegistrationRepo.create({
      email: cleanEmail,
      password_hash: passwordHash,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      resend_count: 0,
      last_sent_at: new Date(),
    });

    // Send email
    // Send verification email (HTML + text)
    await sendVerificationEmail({ to: cleanEmail, otp, ttlMinutes: 5 });

    return { success: true, message: 'Verification code sent' };
  }

  static async verifyOtp(email, otp) {
    if (!email || !otp) throw new AppError('Email and OTP are required', 400);
    const cleanEmail = email.toLowerCase().trim();
    const record = await RegistrationRepo.findByEmail(cleanEmail);
    // If there's no pending registration, it may be that the user was already
    // created by a previous successful verify (duplicate click). In that case
    // return tokens so the client can proceed instead of returning 404.
    if (!record) {
      const existingUser = await UserRepo.findByEmail(cleanEmail);
      if (existingUser) {
        const payload = { sub: existingUser._id.toString(), email: existingUser.email, role: existingUser.role };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ sub: existingUser._id.toString() });
        return {
          success: true,
          message: 'Account already created',
          data: { accessToken, refreshToken, user: { id: existingUser._id.toString(), email: existingUser.email, role: existingUser.role } },
        };
      }
      throw new AppError('No pending registration found for this email', 404);
    }

    // Check attempts
    if (record.attempts >= MAX_INCORRECT_ATTEMPTS) {
      await RegistrationRepo.deleteByEmail(cleanEmail);
      throw new AppError('Maximum verification attempts exceeded', 429);
    }

    // Check expiry
    if (!record.expires_at || record.expires_at.getTime() < Date.now()) {
      await RegistrationRepo.deleteByEmail(cleanEmail);
      throw new AppError('Verification code has expired', 410);
    }

    const match = await bcrypt.compare(otp, record.otp_hash);
    if (!match) {
      await RegistrationRepo.updateById(record._id, { attempts: (record.attempts || 0) + 1 });
      throw new AppError('Invalid verification code', 400);
    }

    // Create user
    const user = await UserRepo.create({ email: cleanEmail, password_hash: record.password_hash, role: 'customer' });

    // Issue tokens for new user
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ sub: user._id.toString() });

    // Delete registration record
    await RegistrationRepo.deleteByEmail(cleanEmail);

    return {
      success: true,
      message: 'Account created successfully',
      data: { accessToken, refreshToken, user: { id: user._id.toString(), email: user.email, role: user.role } },
    };
  }

  static async resendOtp(email) {
    if (!email) throw new AppError('Email is required', 400);
    const cleanEmail = email.toLowerCase().trim();
    const record = await RegistrationRepo.findByEmail(cleanEmail);
    if (!record) throw new AppError('No pending registration found for this email', 404);

    const now = Date.now();
    // Check wait time
    if (record.last_sent_at && record.last_sent_at.getTime() + RESEND_WAIT_MS > now) {
      throw new AppError('Please wait before requesting a new code', 429);
    }

    // Reset hourly counter if last_sent_at older than 1 hour
    let resendCount = record.resend_count || 0;
    if (record.last_sent_at && (now - record.last_sent_at.getTime()) > 60 * 60 * 1000) {
      resendCount = 0;
    }
    if (resendCount >= MAX_RESEND_PER_HOUR) {
      throw new AppError('Resend limit exceeded. Try again later', 429);
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await RegistrationRepo.updateById(record._id, {
      otp_hash: otpHash,
      expires_at: expiresAt,
      resend_count: resendCount + 1,
      last_sent_at: new Date(),
      attempts: 0,
    });

    // Send verification email (HTML + text)
    await sendVerificationEmail({ to: cleanEmail, otp, ttlMinutes: 5 });

    return { success: true, message: 'Verification code resent' };
  }
}

module.exports = RegistrationService;

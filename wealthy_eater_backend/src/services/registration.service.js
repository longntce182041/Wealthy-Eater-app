const https = require('https');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/mail');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const firebaseConfig = require('../config/firebase');

const apiKey = firebaseConfig.clientConfig?.apiKey || process.env.FIREBASE_API_KEY;

const OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes as requested
const RESEND_WAIT_MS = 60 * 1000; // 60 seconds
const MAX_RESEND_PER_HOUR = 5;
const MAX_INCORRECT_ATTEMPTS = 3;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const dataString = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(dataString);
    req.end();
  });
}

async function sendSMSViaFirebase(phone) {
  let formattedPhone = phone.trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '+84' + formattedPhone.substring(1);
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  const maskedPhone = formattedPhone.length > 4
    ? formattedPhone.slice(0, -4).replace(/\d/g, '*') + formattedPhone.slice(-4)
    : '****';
  console.log(`[Firebase SMS] Sending OTP to ${maskedPhone}...`);

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`;
  try {
    const response = await postRequest(url, { phoneNumber: formattedPhone });
    if (!response || !response.sessionInfo) {
      throw new AppError('Failed to send verification SMS via Firebase', 500);
    }
    console.log(`[Firebase SMS] OTP sent successfully to ${maskedPhone}`);
    return response.sessionInfo;
  } catch (err) {
    const apiErrorMsg = err.error?.message || err.message || 'Unknown error';
    let userMsg = `Failed to send SMS: ${apiErrorMsg}`;
    if (apiErrorMsg === 'BILLING_NOT_ENABLED') {
      userMsg = 'SMS service is temporarily unavailable. Please ask the administrator to enable billing on Firebase.';
    }
    throw new AppError(userMsg, 400);
  }
}

async function ensureNutritionistProfile(user) {
  // NOTE: This function is intentionally a no-op after the C-10 security fix.
  // Nutritionist profiles must ONLY be created through the explicit admin-gated
  // POST /api/nutritionists/register flow, never silently on login.
  // Keeping the function signature so callers don't need to change.
}

class RegistrationService {
  static async sendSMSViaFirebase(phone) {
    return sendSMSViaFirebase(phone);
  }

  static async verifyFirebaseOtp(sessionInfo, otp) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`;
    return postRequest(url, { sessionInfo, code: otp });
  }

  static async startRegistration(identifier, password, role = 'customer') {
    if (!identifier || !password) {
      throw new AppError('Identifier and password are required', 400, 'VALIDATION_ERROR');
    }

    const cleanId = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(cleanId);

    const email = isEmail ? cleanId.toLowerCase() : undefined;
    const phone = !isEmail ? cleanId : undefined;

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

    let sessionInfo = null;
    let fallbackToLocal = false;
    let localOtp = null;

    if (!isEmail) {
      try {
        sessionInfo = await sendSMSViaFirebase(phone);
      } catch (err) {
        console.warn(`[Firebase SMS Fallback] Failed to send real SMS: ${err.message}. Falling back to console OTP.`);
        fallbackToLocal = true;
        localOtp = generateOtp();
      }
    }

    const otp = fallbackToLocal ? localOtp : generateOtp();
    let otpCodeToStore;
    
    if (isEmail) {
      const otpHash = await bcrypt.hash(otp, 10);
      otpCodeToStore = `local_otp:${otpHash}`;
    } else if (fallbackToLocal) {
      const otpHash = await bcrypt.hash(otp, 10);
      otpCodeToStore = `local_otp:${otpHash}`;
      console.log(`\n======================================================`);
      console.log(`[Firebase SMS Sandbox] Verification OTP for ${phone}: ${otp}`);
      console.log(`======================================================\n`);
    } else {
      otpCodeToStore = `firebase_session:${sessionInfo}`;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    let user = existing;
    if (!user) {
      user = new User({
        email,
        phone,
        password_hash: passwordHash,
        role: role || 'customer',
        is_active: false,
        otp_code: otpCodeToStore,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        otp_resend_count: 0,
        otp_last_sent_at: new Date(),
      });
    } else {
      // Update pending user details
      user.password_hash = passwordHash;
      user.role = role || 'customer';
      user.otp_code = otpCodeToStore;
      user.otp_expires_at = expiresAt;
      user.otp_attempts = 0;
      user.otp_last_sent_at = new Date();
    }
    await user.save();

    // Send code
    if (isEmail) {
      await sendVerificationEmail({ to: email, otp, ttlMinutes: 3 });
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

    const storedCode = user.otp_code || '';
    
    if (storedCode.startsWith('firebase_session:')) {
      // Phone OTP verification via Firebase Auth REST API
      const sessionInfo = storedCode.substring('firebase_session:'.length);
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`;
      try {
        await postRequest(url, {
          sessionInfo,
          code: otp
        });
      } catch (err) {
        const apiErrorMsg = err.error?.message || err.message || 'Unknown error';
        let userMsg = 'Invalid verification code';
        if (apiErrorMsg === 'SESSION_EXPIRED' || apiErrorMsg === 'CODE_EXPIRED') {
          userMsg = 'Verification code has expired. Please register again.';
        } else if (apiErrorMsg === 'INVALID_CODE') {
          userMsg = 'Invalid verification code. Please check your messages.';
        }
        
        user.otp_attempts = (user.otp_attempts || 0) + 1;
        await user.save();
        
        throw new AppError(userMsg, 400);
      }
    } else {
      // Local OTP verification (starts with local_otp: or legacy bcrypt hash)
      const rawHash = storedCode.startsWith('local_otp:') 
        ? storedCode.substring('local_otp:'.length) 
        : storedCode;
        
      const match = await bcrypt.compare(otp, rawHash);
      if (!match) {
        user.otp_attempts = (user.otp_attempts || 0) + 1;
        await user.save();
        throw new AppError('Invalid verification code', 400, 'VALIDATION_ERROR');
      }
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

    let sessionInfo = null;
    let fallbackToLocal = false;
    let localOtp = null;

    if (!isEmail) {
      try {
        sessionInfo = await sendSMSViaFirebase(phone);
      } catch (err) {
        console.warn(`[Firebase SMS Fallback] Failed to send real SMS: ${err.message}. Falling back to console OTP.`);
        fallbackToLocal = true;
        localOtp = generateOtp();
      }
    }

    const otp = fallbackToLocal ? localOtp : generateOtp();
    let otpCodeToStore;
    
    if (isEmail) {
      const otpHash = await bcrypt.hash(otp, 10);
      otpCodeToStore = `local_otp:${otpHash}`;
    } else if (fallbackToLocal) {
      const otpHash = await bcrypt.hash(otp, 10);
      otpCodeToStore = `local_otp:${otpHash}`;
      console.log(`\n======================================================`);
      console.log(`[Firebase SMS Sandbox] Verification OTP for ${phone} (Resend): ${otp}`);
      console.log(`======================================================\n`);
    } else {
      otpCodeToStore = `firebase_session:${sessionInfo}`;
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    user.otp_code = otpCodeToStore;
    user.otp_expires_at = expiresAt;
    user.otp_resend_count = resendCount + 1;
    user.otp_last_sent_at = new Date();
    user.otp_attempts = 0;
    await user.save();

    // Send code
    if (isEmail) {
      await sendVerificationEmail({ to: email, otp, ttlMinutes: 3 });
    }

    return { success: true, message: 'Verification code resent' };
  }
}

module.exports = RegistrationService;

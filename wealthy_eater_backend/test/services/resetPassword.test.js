/**
 * Unit Tests – ResetPassword (UT_34 to UT_44)
 * UC-05: AuthService.forgetPassword + AuthService.resetPassword
 * Tests based on Excel sheet "ResetPassword"
 */

'use strict';

jest.mock('../../src/models/User');
jest.mock('../../src/utils/mail', () => ({
  sendMail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/services/registration.service', () => ({
  sendSMSViaFirebase: jest.fn().mockRejectedValue(new Error('Firebase unavailable')),
  verifyFirebaseOtp: jest.fn(),
}));
jest.mock('bcryptjs');

const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');
const AuthService = require('../../src/services/auth.service');

function makeMockUser(overrides = {}) {
  return {
    _id: { toString: () => 'user_id_001' },
    email: 'user@gmail.com',
    phone: null,
    is_active: true,
    otp_code: 'local_otp:$2b$10$hashedotp',
    otp_expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min ahead
    otp_attempts: 0,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('ResetPassword – UC-05: forgetPassword + resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(makeMockUser()) });
    bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$newhash');
    bcrypt.compare = jest.fn().mockResolvedValue(true);
  });

  // UTCID01 – valid email exists → OTP sent → success
  it('UTCID01 – valid registered email → sends OTP, returns success (Normal)', async () => {
    const result = await AuthService.forgetPassword('user@gmail.com');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID02 – valid phone → fallback OTP sent → success
  it('UTCID02 – valid phone (Firebase fallback) → OTP printed, returns success (Normal)', async () => {
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeMockUser({ phone: '0912345678', email: null }))
    });
    const result = await AuthService.forgetPassword('0912345678');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID03 – non-existent email → silent success (anti-scan)
  it('UTCID03 – non-existent email → still returns success (anti-enumeration) (Abnormal)', async () => {
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const result = await AuthService.forgetPassword('ghost@gmail.com');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID04 – null identifier → 400 VALIDATION_ERROR
  it('UTCID04 – null identifier → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.forgetPassword('')).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID05 – valid OTP + valid new password → password reset success
  it('UTCID05 – valid OTP + valid new password → resets password (Normal)', async () => {
    const result = await AuthService.resetPassword('user@gmail.com', '123456', 'NewPass456!');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID06 – user not found during reset → 400 VALIDATION_ERROR
  it('UTCID06 – user not found during reset → throws 400 (Abnormal)', async () => {
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(AuthService.resetPassword('ghost@gmail.com', '123456', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID07 – expired OTP → 410 CODE_EXPIRED
  it('UTCID07 – expired OTP → throws 410 CODE_EXPIRED (Abnormal)', async () => {
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(
        makeMockUser({ otp_expires_at: new Date(Date.now() - 1000) })
      )
    });
    await expect(AuthService.resetPassword('user@gmail.com', '123456', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 410,
      errorCode: 'CODE_EXPIRED'
    });
  });

  // UTCID08 – OTP attempts exceeded (>= 3) → 429 RATE_LIMIT_EXCEEDED
  it('UTCID08 – OTP attempts >= 3 → throws 429 RATE_LIMIT_EXCEEDED (Abnormal)', async () => {
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeMockUser({ otp_attempts: 3 }))
    });
    await expect(AuthService.resetPassword('user@gmail.com', '000000', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 429,
      errorCode: 'RATE_LIMIT_EXCEEDED'
    });
  });

  // UTCID09 – new password too short → 400
  it('UTCID09 – new password < 6 chars → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.resetPassword('user@gmail.com', '123456', 'N1!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID10 – new password at exactly 6 chars (min boundary) → success
  it('UTCID10 – 6-char new password (min boundary) → resets password (Boundary)', async () => {
    const result = await AuthService.resetPassword('user@gmail.com', '123456', 'Ab1!cd');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID11 – missing any required field → 400 VALIDATION_ERROR
  it('UTCID11 – missing OTP field → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.resetPassword('user@gmail.com', '', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400
    });
  });
});

/**
 * Unit Tests – ChangePassword (UT_23 to UT_33)
 * UC-04: AuthService.changePassword
 * Tests based on Excel sheet "ChangePassword"
 */

'use strict';

jest.mock('../../src/repositories/user.repository');
jest.mock('bcryptjs');

const UserRepository = require('../../src/repositories/user.repository');
const bcrypt = require('bcryptjs');
const AuthService = require('../../src/services/auth.service');

function makeMockUser(overrides = {}) {
  return {
    _id: { toString: () => 'user_id_001' },
    email: 'user@gmail.com',
    role: 'customer',
    is_active: true,
    password_hash: '$2b$10$hashedpassword',
    reset_password_token: null,
    reset_password_expires: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('ChangePassword – UC-04: AuthService.changePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UserRepository.findById = jest.fn().mockResolvedValue(makeMockUser());
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    bcrypt.hash = jest.fn().mockResolvedValue('$2b$10$newhash');
  });

  // UTCID01 – all valid → success
  it('UTCID01 – valid userId + correct old + valid new → returns success (Normal)', async () => {
    const result = await AuthService.changePassword('user_id_001', 'OldPass123!', 'NewPass456!');
    expect(result).toEqual({ success: true, message: 'Password changed successfully' });
  });

  // UTCID02 – userId missing → 400 VALIDATION_ERROR
  it('UTCID02 – missing userId → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.changePassword('', 'OldPass123!', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR'
    });
  });

  // UTCID03 – old password missing → 400 VALIDATION_ERROR
  it('UTCID03 – missing old password → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.changePassword('user_id_001', '', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID04 – new password missing → 400 VALIDATION_ERROR
  it('UTCID04 – missing new password → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.changePassword('user_id_001', 'OldPass123!', '')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID05 – user not found → 404 USER_NOT_FOUND
  it('UTCID05 – user not found → throws 404 USER_NOT_FOUND (Abnormal)', async () => {
    UserRepository.findById = jest.fn().mockResolvedValue(null);
    await expect(AuthService.changePassword('bad_id', 'OldPass123!', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 404
    });
  });

  // UTCID06 – account has no password (social login) → 400
  it('UTCID06 – social-only account (no password) → throws 400 (Abnormal)', async () => {
    UserRepository.findById = jest.fn().mockResolvedValue(makeMockUser({ password_hash: null }));
    await expect(AuthService.changePassword('user_id_001', 'OldPass123!', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID07 – incorrect old password → 400
  it('UTCID07 – incorrect current password → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    await expect(AuthService.changePassword('user_id_001', 'WrongOld!', 'NewPass456!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID08 – new password same as old → 400
  it('UTCID08 – new password same as old → throws 400 (Abnormal)', async () => {
    await expect(AuthService.changePassword('user_id_001', 'SamePass1!', 'SamePass1!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID09 – new password too short (< 6 chars) → 400
  it('UTCID09 – new password length < 6 → throws 400 VALIDATION_ERROR (Abnormal)', async () => {
    await expect(AuthService.changePassword('user_id_001', 'OldPass123!', 'N1!')).rejects.toMatchObject({
      statusCode: 400
    });
  });

  // UTCID10 – new password at min boundary (6 chars) → success
  it('UTCID10 – new password exactly 6 chars (boundary) → success (Boundary)', async () => {
    const result = await AuthService.changePassword('user_id_001', 'OldPass123!', 'Ab1!cd');
    expect(result).toHaveProperty('success', true);
  });

  // UTCID11 – new password exactly 128 chars → success
  it('UTCID11 – new password exactly 128 chars (max boundary) → success (Boundary)', async () => {
    const longPass = 'A' + '1'.repeat(126) + '!';
    const result = await AuthService.changePassword('user_id_001', 'OldPass123!', longPass);
    expect(result).toHaveProperty('success', true);
  });
});

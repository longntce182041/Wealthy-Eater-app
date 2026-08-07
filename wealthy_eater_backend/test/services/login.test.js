/**
 * Unit Tests – Login (UT_12 to UT_22)
 * UC-03: AuthService.login
 * Tests based on Excel sheet "Login"
 */

'use strict';

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/utils/jwt');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Nutritionist');

const UserRepository = require('../../src/repositories/user.repository');
const { signAccessToken, signRefreshToken } = require('../../src/utils/jwt');
const AuthService = require('../../src/services/auth.service');

function makeMockUser(overrides = {}) {
  return {
    _id: { toString: () => 'user_id_001' },
    email: 'user@gmail.com',
    phone: null,
    role: 'customer',
    is_active: true,
    password_hash: '$2b$10$hashedpassword',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('Login – UC-03: AuthService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signAccessToken.mockReturnValue('mock_access_token');
    signRefreshToken.mockReturnValue('mock_refresh_token');

    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    // Default: user found via email
    UserRepository.findByEmail = jest.fn().mockResolvedValue(makeMockUser());
    
    const User = require('../../src/models/User');
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    
    const Nutritionist = require('../../src/models/Nutritionist');
    Nutritionist.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  });

  // UTCID01 – valid email + valid password → tokens issued
  it('UTCID01 – valid email + correct password → returns accessToken (Normal)', async () => {
    const result = await AuthService.login('user@gmail.com', 'Password123!');
    expect(result).toHaveProperty('accessToken', 'mock_access_token');
    expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
  });

  // UTCID02 – valid phone + valid password → tokens issued
  it('UTCID02 – valid phone + correct password → returns accessToken (Normal)', async () => {
    const User = require('../../src/models/User');
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeMockUser({ phone: '0987654321', email: null }))
    });
    const result = await AuthService.login('0987654321', 'Password123!');
    expect(result).toHaveProperty('accessToken');
  });

  // UTCID03 – null identifier → 400
  it('UTCID03 – null identifier → throws 400 (Abnormal)', async () => {
    await expect(AuthService.login('', 'Password123!')).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID04 – null password → 400
  it('UTCID04 – null password → throws 400 (Abnormal)', async () => {
    await expect(AuthService.login('user@gmail.com', '')).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID05 – user not found → 401
  it('UTCID05 – non-existent account → throws 401 Invalid credentials (Abnormal)', async () => {
    UserRepository.findByEmail = jest.fn().mockResolvedValue(null);
    await expect(AuthService.login('ghost@gmail.com', 'Password123!')).rejects.toMatchObject({ statusCode: 401 });
  });

  // UTCID06 – account inactive → 401 UNVERIFIED_ACCOUNT
  it('UTCID06 – unverified account → throws 401 UNVERIFIED_ACCOUNT (Abnormal)', async () => {
    UserRepository.findByEmail = jest.fn().mockResolvedValue(makeMockUser({ is_active: false }));
    await expect(AuthService.login('user@gmail.com', 'Password123!')).rejects.toMatchObject({
      statusCode: 401,
      errorCode: 'UNVERIFIED_ACCOUNT'
    });
  });

  // UTCID07 – wrong password → 401
  it('UTCID07 – wrong password → throws 401 Invalid credentials (Abnormal)', async () => {
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    await expect(AuthService.login('user@gmail.com', 'WrongPass!')).rejects.toMatchObject({ statusCode: 401 });
  });

  // UTCID08 – wrong role → 403 Access denied
  it('UTCID08 – user logs into admin portal → throws 403 Access denied (Abnormal)', async () => {
    await expect(AuthService.login('user@gmail.com', 'Password123!', 'admin')).rejects.toMatchObject({ statusCode: 403 });
  });

  // UTCID09 – account has no password hash → 400
  it('UTCID09 – social-only account (no password) → throws 400 (Abnormal)', async () => {
    UserRepository.findByEmail = jest.fn().mockResolvedValue(makeMockUser({ password_hash: null }));
    await expect(AuthService.login('user@gmail.com', 'Password123!')).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID10 – boundary: exactly minimum valid password length (6 chars)
  it('UTCID10 – 6-char password (min boundary) → successfully logs in if hash matches (Boundary)', async () => {
    const result = await AuthService.login('user@gmail.com', 'Abc12!');
    expect(result).toHaveProperty('accessToken');
  });

  // UTCID11 – boundary: exactly 128 char password → successfully logs in
  it('UTCID11 – 128-char password (max boundary) → successfully logs in if hash matches (Boundary)', async () => {
    const longPass = 'A' + '1'.repeat(126) + '!';
    const result = await AuthService.login('user@gmail.com', longPass);
    expect(result).toHaveProperty('accessToken');
  });
});

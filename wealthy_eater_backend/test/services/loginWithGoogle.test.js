/**
 * Unit Tests – LoginWithGoogle (UT_45 to UT_55)
 * UC-02: AuthService.googleLogin
 * Tests based on Excel sheet "LoginWithGoogle"
 */

'use strict';

jest.mock('../../src/models/User');
jest.mock('../../src/models/Nutritionist');
jest.mock('../../src/utils/jwt');
jest.mock('google-auth-library');

const User = require('../../src/models/User');
const Nutritionist = require('../../src/models/Nutritionist');
const { OAuth2Client } = require('google-auth-library');
const { signAccessToken, signRefreshToken } = require('../../src/utils/jwt');
const AuthService = require('../../src/services/auth.service');

function makeMockUser(overrides = {}) {
  return {
    _id: { toString: () => 'user_id_google_001' },
    email: 'googleuser@gmail.com',
    phone: null,
    role: 'customer',
    is_active: true,
    googleId: 'google_sub_12345',
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('LoginWithGoogle – UC-02: AuthService.googleLogin', () => {
  let mockVerifyIdToken;
  let mockGetTokenInfo;

  beforeEach(() => {
    jest.clearAllMocks();
    signAccessToken.mockReturnValue('mock_access_token');
    signRefreshToken.mockReturnValue('mock_refresh_token');

    Nutritionist.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    mockVerifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'googleuser@gmail.com',
        sub: 'google_sub_12345'
      })
    });

    mockGetTokenInfo = jest.fn().mockResolvedValue({
      email: 'googleuser@gmail.com',
      sub: 'google_sub_12345'
    });

    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
      getTokenInfo: mockGetTokenInfo,
    }));

    // Default: existing active user found
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(makeMockUser()) });
    User.mockImplementation(() => makeMockUser());
  });

  // UTCID01 – valid idToken, existing user → tokens issued
  it('UTCID01 – valid idToken + existing account → returns accessToken (Normal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    const result = await AuthService.googleLogin('valid_id_token', null);
    expect(result).toHaveProperty('accessToken', 'mock_access_token');
  });

  // UTCID02 – valid accessToken, existing user → tokens issued
  it('UTCID02 – valid accessToken + existing account → returns accessToken (Normal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    const result = await AuthService.googleLogin(null, 'valid_access_token');
    expect(result).toHaveProperty('accessToken');
  });

  // UTCID03 – valid idToken, new user → auto-creates account + tokens issued
  it('UTCID03 – valid idToken + new user → creates account, returns tokens (Normal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const savedUser = makeMockUser({ is_active: true });
    User.mockImplementation(() => ({
      ...savedUser,
      save: jest.fn().mockResolvedValue(savedUser),
    }));
    const result = await AuthService.googleLogin('new_user_id_token', null);
    expect(result).toHaveProperty('accessToken');
  });

  // UTCID04 – neither idToken nor accessToken → 400
  it('UTCID04 – no token provided → throws 400 (Abnormal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    await expect(AuthService.googleLogin(null, null)).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID05 – invalid/expired idToken → 401
  it('UTCID05 – invalid/expired idToken → throws 401 (Abnormal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
      getTokenInfo: mockGetTokenInfo,
    }));
    await expect(AuthService.googleLogin('bad_token', null)).rejects.toMatchObject({ statusCode: 401 });
  });

  // UTCID06 – invalid accessToken → 401
  it('UTCID06 – invalid accessToken → throws 401 (Abnormal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    mockGetTokenInfo.mockRejectedValue(new Error('Invalid token'));
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
      getTokenInfo: mockGetTokenInfo,
    }));
    await expect(AuthService.googleLogin(null, 'bad_access_token')).rejects.toMatchObject({ statusCode: 401 });
  });

  // UTCID07 – Google client ID not configured → 500
  it('UTCID07 – GOOGLE_CLIENT_ID not configured on server → throws 500 (Abnormal)', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    // Reload module to pick up missing env
    jest.resetModules();
    const AuthServiceFresh = require('../../src/services/auth.service');
    await expect(AuthServiceFresh.googleLogin('any_token', null)).rejects.toMatchObject({ statusCode: 500 });
    process.env.GOOGLE_CLIENT_ID = saved;
  });

  // UTCID08 – Google payload has no email → 400
  it('UTCID08 – Google account without email → throws 400 (Abnormal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'google_sub_12345', email: null })
    });
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
      getTokenInfo: mockGetTokenInfo,
    }));
    await expect(AuthService.googleLogin('no_email_token', null)).rejects.toMatchObject({ statusCode: 400 });
  });

  // UTCID09 – existing inactive user → auto-activates and logs in
  it('UTCID09 – previously inactive account → activated and tokens issued (Normal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(makeMockUser({ is_active: false }))
    });
    const result = await AuthService.googleLogin('valid_id_token', null);
    expect(result).toHaveProperty('accessToken');
  });

  // UTCID10 – existing user without googleId → links googleId on login
  it('UTCID10 – existing email account without googleId → googleId linked (Normal)', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test_client_id';
    const userWithoutGoogleId = makeMockUser({ googleId: null });
    User.findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(userWithoutGoogleId) });
    const result = await AuthService.googleLogin('valid_id_token', null);
    expect(result).toHaveProperty('accessToken');
    expect(userWithoutGoogleId.save).toHaveBeenCalled();
  });
});

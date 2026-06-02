const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/user.repository');
const { signAccessToken } = require('../utils/jwt');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;


class AuthService {
  static async login(email, password) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (user.isActive === false || user.status === 'inactive') {
      const err = new Error('User is inactive');
      err.status = 403;
      throw err;
    }

    // support both `password` and legacy `passwordHash` field names in DB
    const hash = user.password || user.passwordHash || user.password_hash;
    const matched = await bcrypt.compare(password, hash || '');
    if (!matched) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = signAccessToken(payload, process.env.JWT_EXPIRES_IN || '1h');

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    };
  }
}

AuthService.googleLogin = async function (idToken) {
  if (!GOOGLE_CLIENT_ID) {
    const err = new Error('GOOGLE_CLIENT_ID not configured');
    err.status = 500;
    throw err;
  }

  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  } catch (e) {
    const err = new Error('Invalid Google idToken');
    err.status = 401;
    throw err;
  }

  const payload = ticket.getPayload();
  const googleId = payload.sub;
  const email = payload.email;
  const fullName = payload.name || payload.given_name || '';
  const avatar = payload.picture || '';

  if (!email) {
    const err = new Error('Google token does not contain email');
    err.status = 400;
    throw err;
  }

  // try find existing user by email first
  let user = await UserRepository.findByEmail(email);

  if (!user) {
    // create new user
    const newUser = {
      fullName: fullName || email.split('@')[0],
      email,
      provider: 'google',
      googleId,
      avatar,
      role: 'customer',
      status: 'active',
      isActive: true
    };

    user = await UserRepository.create(newUser);
  } else {
    // if user exists but doesn't have googleId set, set it
    let shouldSave = false;
    if (!user.googleId) {
      user.googleId = googleId;
      shouldSave = true;
    }
    if (!user.provider || user.provider !== 'google') {
      user.provider = 'google';
      shouldSave = true;
    }
    if (avatar && !user.avatar) {
      user.avatar = avatar;
      shouldSave = true;
    }
    if (shouldSave) await user.save();
  }

  if (user.isActive === false || user.status === 'inactive') {
    const err = new Error('User is inactive');
    err.status = 403;
    throw err;
  }

  const tokenPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role
  };

  const accessToken = signAccessToken(tokenPayload, process.env.JWT_EXPIRES_IN || '1h');

  return {
    accessToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      provider: user.provider
    }
  };
};

module.exports = AuthService;

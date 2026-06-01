const jwt = require('jsonwebtoken');

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'please-set-a-secret-in-env';

function signAccessToken(payload, expiresIn = '1h') {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

module.exports = {
  signAccessToken,
  verifyToken
};

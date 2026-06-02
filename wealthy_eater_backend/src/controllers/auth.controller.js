const AuthService = require('../services/auth.service');

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const result = await AuthService.login(email, password);

    return res.json({ success: true, message: 'Login successful', data: result });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ success: false, message });
  }
}

async function googleLogin(req, res) {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ success: false, message: 'idToken is required' });

    const result = await AuthService.googleLogin(idToken);
    return res.json({ success: true, message: 'Google login successful', data: result });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    return res.status(status).json({ success: false, message });
  }
}

module.exports = {
  login,
  googleLogin
};

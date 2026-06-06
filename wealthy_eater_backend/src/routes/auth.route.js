const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');

// POST /api/auth/login          — email + password login
router.post('/login', AuthController.login);

// POST /api/auth/google         — Google OAuth login / auto-register
router.post('/google', AuthController.googleLogin);

// Registration + OTP flows
router.post('/register', AuthController.register);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/resend-otp', AuthController.resendOtp);

// POST /api/auth/refresh        — exchange refreshToken for new accessToken
router.post('/refresh', AuthController.refresh);

// GET  /api/auth/me             — get current user profile (requires auth)
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;

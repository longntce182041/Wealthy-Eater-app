const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

// POST /api/auth/login
router.post('/login', AuthController.login);
// POST /api/auth/google
router.post('/google', AuthController.googleLogin);

module.exports = router;

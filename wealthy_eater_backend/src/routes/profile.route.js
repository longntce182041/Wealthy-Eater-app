const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profile.controller');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/profile/me
router.get('/me', authenticateToken, ProfileController.getMyProfile);

// POST /api/profile
router.post('/', authenticateToken, ProfileController.createOrUpdateProfile);

module.exports = router;

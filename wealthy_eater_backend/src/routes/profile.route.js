const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profile.controller');
const { authenticateToken } = require('../middlewares/auth');
const { avatarUpload } = require('../config/cloudinary.config');

// GET /api/profile/me
router.get('/me', authenticateToken, ProfileController.getMyProfile);

// POST /api/profile
router.post('/', authenticateToken, ProfileController.createOrUpdateProfile);

// POST /api/profile/avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), ProfileController.uploadAvatar);

// POST /api/profile/weight
router.post('/weight', authenticateToken, ProfileController.logWeight);

// GET /api/profile/weight-history
router.get('/weight-history', authenticateToken, ProfileController.getWeightHistory);

// GET /api/profile/setup-metadata
router.get('/setup-metadata', authenticateToken, ProfileController.getSetupMetadata);

module.exports = router;


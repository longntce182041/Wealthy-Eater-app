const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/user.notification.controller');
const { protect } = require('../middlewares/authMiddleware');

// Base path: /api/user/notifications

router.get('/settings', protect, notificationController.getSettings);
router.put('/settings', protect, notificationController.updateSettings);

router.get('/history', protect, notificationController.getHistory);
router.patch('/:notification_id/read', protect, notificationController.markAsRead);

module.exports = router;

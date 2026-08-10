const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Helper wrapper bắt lỗi Async giúp Router không bao giờ bị dính "Unhandled Promise Rejection"
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Apply JWT authentication & Admin-only authorization to all routes below
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// UC-77: Get list of users with filtering & pagination
router.get('/', asyncHandler(adminUserController.getUsersList));

// Create a new user (Customer / Nutritionist / Admin)
router.post('/', asyncHandler(adminUserController.createUser));

// UC-79: Update user profile and details
router.put('/:id', asyncHandler(adminUserController.updateUser));

// Update user account status (Active / Banned / Suspended)
router.put('/:id/status', asyncHandler(adminUserController.updateUserStatus));

// UC-79: Permanently delete a user account
router.delete('/:id', asyncHandler(adminUserController.deleteUser));

module.exports = router;
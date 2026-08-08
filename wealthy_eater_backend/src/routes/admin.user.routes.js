const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Apply JWT authentication & Admin-only authorization to all routes below
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// UC-77: Get list of users with filtering & pagination
router.get('/', adminUserController.getUsersList);

// Create a new user (Customer / Nutritionist / Admin)
router.post('/', adminUserController.createUser);

// UC-79: Update user profile and details
router.put('/:id', adminUserController.updateUser);

// Update user account status (Active / Banned / Suspended)
router.put('/:id/status', adminUserController.updateUserStatus);

// UC-79: Permanently delete a user account
router.delete('/:id', adminUserController.deleteUser);

module.exports = router;
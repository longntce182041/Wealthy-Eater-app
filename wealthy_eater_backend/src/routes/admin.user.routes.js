const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Apply JWT authentication + admin-only authorization to ALL routes in this file.
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// UC-77: GET /api/admin/users — View list of all users
router.get('/', adminUserController.getUsersList);

// POST /api/admin/users — Create a new user
router.post('/', adminUserController.createUser);

// PUT /api/admin/users/:id — Cập nhật thông tin User (Email, Role, Status)
router.put('/:id', adminUserController.updateUser);

// PUT /api/admin/users/:id/status — Cập nhật nhanh trạng thái (Active/Banned)
router.put('/:id/status', adminUserController.updateUserStatus);

// DELETE /api/admin/users/:id — Xóa vĩnh viễn user
router.delete('/:id', adminUserController.deleteUser);

module.exports = router;
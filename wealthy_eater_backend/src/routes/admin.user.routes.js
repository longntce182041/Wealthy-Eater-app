const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Apply JWT authentication + admin-only authorization to ALL routes in this file.
// Previously these routes had zero middleware — a critical security vulnerability.
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// UC-77: GET /api/admin/users — View list of all users
router.get('/', adminUserController.getUsersList);

// POST /api/admin/users — Create a new user
router.post('/', adminUserController.createUser);

module.exports = router;
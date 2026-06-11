

const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');

// UC-77: View List User dành cho Admin Dashboard
router.get('/', adminUserController.getUsersList); 
// Create user
router.post('/', adminUserController.createUser);

module.exports = router;
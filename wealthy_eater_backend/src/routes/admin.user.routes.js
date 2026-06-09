console.log('Loaded admin.user.routes');

const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/admin.user.controller');

// UC-77: View List User dành cho Admin Dashboard
router.get('/users', adminUserController.getUsersList); 
// Lưu ý: Nên để là '/users' vì thông thường ở file gốc index.js bạn sẽ gộp chung tiền tố dạng app.use('/api/admin', adminUserRoutes)

module.exports = router;
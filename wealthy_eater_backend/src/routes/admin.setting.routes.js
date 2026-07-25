const express = require('express');
const router = express.Router();
const { getCommissionRate, updateCommissionRate } = require('../controllers/admin.setting.controller');
// const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware'); // Middleware bảo vệ nếu có

// Route lấy và cập nhật cấu hình hoa hồng
router.get('/commission-rate', getCommissionRate);
router.put('/commission-rate', updateCommissionRate);

module.exports = router;
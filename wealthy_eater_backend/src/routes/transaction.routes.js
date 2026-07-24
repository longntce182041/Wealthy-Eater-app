const express = require('express');
const router = express.Router();
const { handlePayOSWebhook, getTransactionLogs } = require('../controllers/transactionController');

// Route Webhook mở công khai cho cổng PayOS gọi sang
router.post('/webhooks/payos', handlePayOSWebhook);

// Route Admin lấy bảng nhật ký đối soát dòng tiền
router.get('/admin/transactions', getTransactionLogs);

module.exports = router;
/**
 * webhook.routes.js — Public webhook endpoints (no JWT auth required).
 *
 * These endpoints are called by external services (e.g., PayOS) and
 * are verified via HMAC signature instead of JWT tokens.
 *
 * Mounted at: /api/webhooks
 */

const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/user.consultation.controller');

// ── PayOS Webhook ────────────────────────────────────────────────────────────
// POST /api/webhooks/payos
// NOTE: Uses express.raw() to preserve the raw body for HMAC signature verification.
//       The controller handles parsing Buffer → JSON internally.
router.post(
  '/payos',
  express.raw({ type: 'application/json' }),
  consultationController.handlePayOSWebhook
);

// ── PayOS Return & Cancel Pages (For Local Testing) ──────────────────────────
// GET /api/webhooks/payos/return
router.get('/payos/return', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #4CAF50;">✅ Thanh toán thành công!</h1>
        <p>Giao dịch của bạn đã được ghi nhận.</p>
        <p style="color: gray;">Vui lòng đóng trình duyệt này và quay lại ứng dụng Wealthy Eater.</p>
      </body>
    </html>
  `);
});

// ALL /api/webhooks/payos/cancel
router.all('/payos/cancel', consultationController.handlePayOSCancel, (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #F44336;">❌ Thanh toán đã bị hủy</h1>
        <p>Bạn đã hủy giao dịch hoặc có lỗi xảy ra.</p>
        <p style="color: gray;">Vui lòng đóng trình duyệt này và quay lại ứng dụng Wealthy Eater.</p>
      </body>
    </html>
  `);
});

module.exports = router;

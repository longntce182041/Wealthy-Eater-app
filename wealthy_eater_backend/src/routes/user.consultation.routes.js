/**
 * user.consultation.routes.js — Routes for the "Hire a Nutritionist" feature.
 *
 * All routes are protected by JWT authentication (user-facing).
 * Mounted at: /api/user/consultations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const consultationController = require('../controllers/user.consultation.controller');

// ── Hire a Nutritionist (creates PayOS checkout) ─────────────────────────────
// POST /api/user/consultations/hire
router.post('/hire', protect, consultationController.hireNutritionist);

// GET /api/user/consultations/active
router.get('/active', protect, consultationController.getActiveContract);

// 2. GET PAYOS URLS (FOR WEBVIEW INTERCEPTION)
// GET /api/user/consultations/payos/urls
router.get('/payos/urls', protect, consultationController.getPayOSUrls);

// 3. GET TRANSACTION DETAIL ───────────────────────────────────────────────────────
// GET /api/user/consultations/transactions/:id
router.get('/transactions/:id', protect, consultationController.getTransactionDetail);

// 4. MANUAL VERIFY PAYMENT (Fallback for missing local webhooks) ──────────────
// POST /api/user/consultations/verify-payment
router.post('/verify-payment', protect, consultationController.verifyPayment);

module.exports = router;

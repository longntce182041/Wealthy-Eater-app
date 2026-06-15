/**
 * nutritionist.chat.routes.js — Nutritionist-specific routes for chat.
 *
 * Mounted at: /api/nutritionist
 * Requires: JWT + nutritionist role
 */

const express          = require('express');
const router           = express.Router();
const { protect, nutritionistOnly } = require('../middlewares/authMiddleware');
const chatController   = require('../controllers/chat.controller');

// ── GET Active Contracts (Clients Tab) ────────────────────────────────────────
// GET /api/nutritionist/contracts/active
// Returns all active consultation contracts for the authenticated nutritionist,
// each enriched with the customer's user info and unread message count.
router.get(
  '/contracts/active',
  protect,
  nutritionistOnly,
  chatController.getNutritionistActiveContracts.bind(chatController)
);

module.exports = router;

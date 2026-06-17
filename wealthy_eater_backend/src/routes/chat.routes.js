/**
 * chat.routes.js — HTTP routes for the Consultation Chat feature.
 *
 * Mounted at: /api/chat
 * All routes require a valid JWT (protect middleware).
 */

const express        = require('express');
const router         = express.Router();
const { protect }    = require('../middlewares/authMiddleware');
const { chatUpload } = require('../config/cloudinary.config');
const chatController = require('../controllers/chat.controller');

// ── Message History ───────────────────────────────────────────────────────────
// GET /api/chat/:contractId/messages
// Query: ?page=1&limit=30&before=<messageId>
router.get(
  '/:contractId/messages',
  protect,
  chatController.getMessages.bind(chatController)
);

// ── Image Upload ──────────────────────────────────────────────────────────────
// POST /api/chat/:contractId/messages/image
// Body: multipart/form-data, field name = 'image'
router.post(
  '/:contractId/messages/image',
  protect,
  chatUpload.single('image'),
  chatController.uploadImage.bind(chatController)
);

// ── Mark Messages as Read ─────────────────────────────────────────────────────
// PATCH /api/chat/:contractId/messages/read
router.patch(
  '/:contractId/messages/read',
  protect,
  chatController.markRead.bind(chatController)
);

module.exports = router;

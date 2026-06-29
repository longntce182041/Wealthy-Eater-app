/**
 * user.chatbot.routes.js — Route definitions for the AI Nutrition Chatbot.
 *
 * All routes require JWT authentication via `protect` middleware.
 * Rate limiting at the Express level is handled inside the service
 * (per-user soft rate limit) to keep the middleware stack lean.
 *
 * Mounted at: /api/user/chatbot  (see src/routes/index.js)
 */

const express    = require('express');
const { protect } = require('../middlewares/authMiddleware');
const controller  = require('../controllers/user.chatbot.controller');

const router = express.Router();

// Apply JWT auth to all chatbot routes
router.use(protect);

/**
 * POST /api/user/chatbot/message
 * Send a message to NutriBot and get an AI-generated reply.
 */
router.post('/message', controller.sendMessage.bind(controller));

/**
 * GET /api/user/chatbot/history
 * Retrieve conversation history from the active session.
 */
router.get('/history', controller.getHistory.bind(controller));

/**
 * DELETE /api/user/chatbot/session
 * Reset (clear) the current session to start a fresh conversation.
 */
router.delete('/session', controller.resetSession.bind(controller));

module.exports = router;

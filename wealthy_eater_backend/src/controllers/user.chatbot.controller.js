/**
 * user.chatbot.controller.js — HTTP handlers for the AI Nutrition Chatbot.
 *
 * Routes exposed:
 *  POST /api/user/chatbot/message   — Send a message, get AI reply
 *  GET  /api/user/chatbot/history   — Fetch conversation history
 *  DELETE /api/user/chatbot/session — Reset (clear) current session
 *
 * All errors are delegated via next(err) to the global error handler.
 * No JSON formatting occurs inside controllers (Clean Code principle).
 */

const chatbotService = require('../services/user.chatbot.service');
const AppError       = require('../utils/AppError');

class UserChatbotController {
  /**
   * POST /api/user/chatbot/message
   *
   * Body:
   *  { message: string, session_id?: string }
   *
   * Returns:
   *  { success: true, data: { reply, sessionId, role } }
   */
  async sendMessage(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id;
      const { message, session_id } = req.body;

      if (session_id && typeof session_id !== 'string') {
        return next(new AppError('Invalid session ID format.', 400, 'VALIDATION_ERROR'));
      }

      if (!message || typeof message !== 'string' || !message.trim()) {
        return next(
          new AppError('Tin nhắn không được để trống.', 400, 'VALIDATION_ERROR')
        );
      }

      const trimmed = message.trim();
      if (trimmed.length > 2000) {
        return next(
          new AppError(
            'Tin nhắn không được vượt quá 2000 ký tự.',
            400,
            'MESSAGE_TOO_LONG'
          )
        );
      }

      const result = await chatbotService.sendMessage(userId, trimmed, session_id || null);

      return res.status(200).json({
        success: true,
        data: result,
        error: null,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/user/chatbot/history
   *
   * Query params:
   *  limit?: number (default 20, max 50)
   *
   * Returns:
   *  { success: true, data: { sessionId, messages: [] } }
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id;
      const limit  = req.query.limit || 20;

      const history = await chatbotService.getHistory(userId, limit);

      return res.status(200).json({
        success: true,
        data: history,
        error: null,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * DELETE /api/user/chatbot/session
   *
   * Soft-deletes the current active session so the next message
   * starts a fresh conversation.
   *
   * Returns:
   *  { success: true, data: { cleared: boolean } }
   */
  async resetSession(req, res, next) {
    try {
      const userId = req.user.sub || req.user.id;
      const result = await chatbotService.resetSession(userId);

      return res.status(200).json({
        success: true,
        data: result,
        error: null,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new UserChatbotController();

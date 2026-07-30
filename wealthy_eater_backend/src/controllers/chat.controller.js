/**
 * chat.controller.js — HTTP handlers for the Consultation Chat feature.
 *
 * All handlers follow the standard API response contract:
 *   { success: boolean, data: object|null, error: { code, message }|null }
 *
 * Routes mounted at: /api/chat
 */

const AppError = require('../utils/AppError');
const chatService = require('../services/chat.service');

class ChatController {
  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/chat/:contractId/messages
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetch paginated message history for a chat room.
   *
   * Query params:
   *  - page   (number, default 1)
   *  - limit  (number, default 30, max 100)
   *  - before (string, message _id — cursor for older messages)
   */
  async getMessages(req, res, next) {
    try {
      const userId     = req.user.sub || req.user.id;
      const contractId = req.params.contractId;
      const { page, limit, before } = req.query;

      const result = await chatService.getMessageHistory(contractId, userId, {
        page,
        limit,
        before,
      });

      return res.status(200).json({
        success: true,
        data:    result,
        error:   null,
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /api/chat/:contractId/messages/image
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Upload a meal image and persist it as an image message.
   * Expects multipart/form-data with field name `image`.
   */
  async uploadImage(req, res, next) {
    try {
      const userId     = req.user.sub || req.user.id;
      const contractId = req.params.contractId;
      const file       = req.file;

      const message = await chatService.uploadImageAndSaveMessage(contractId, userId, file);

      // ── Broadcast via Socket.IO so the other party sees it instantly ──────────
      const io = req.app.get('io');
      if (io) {
        io.to(contractId).emit('new_message', message);
      }

      return res.status(201).json({
        success: true,
        data:    message,
        error:   null,
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PATCH /api/chat/:contractId/messages/read
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mark all unread messages (sent by the other party) as read.
   * Broadcasts a `messages_read` event to the room.
   */
  async markRead(req, res, next) {
    try {
      const userId     = req.user.sub || req.user.id;
      const contractId = req.params.contractId;

      const result = await chatService.markMessagesRead(contractId, userId);

      // Notify the other party that their messages were read
      const io = req.app.get('io');
      if (io) {
        io.to(contractId).emit('messages_read', {
          contract_id: contractId,
          reader_id:   userId,
        });
      }

      return res.status(200).json({
        success: true,
        data:    result,
        error:   null,
      });
    } catch (error) {
      return next(error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /api/nutritionist/contracts/active
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Returns all active consultation contracts for the authenticated nutritionist.
   * Used to populate the Clients tab in the nutritionist mobile screen.
   */
  async getNutritionistActiveContracts(req, res, next) {
    try {
      const userId    = req.user.sub || req.user.id;
      const contracts = await chatService.getActiveContractsForNutritionist(userId);

      return res.status(200).json({
        success: true,
        data:    contracts,
        error:   null,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ChatController();

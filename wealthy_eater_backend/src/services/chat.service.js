/**
 * chat.service.js — Business logic for the real-time Consultation Chat feature.
 *
 * Responsibilities:
 *  1. Validate that a caller (user or nutritionist) belongs to a given contract.
 *  2. Persist and retrieve ConsultationMessages with full pagination.
 *  3. Mark messages as read atomically.
 *  4. Handle image uploads: validate → move to disk → persist image message.
 *
 * This service is used by both the HTTP controller (history, upload, mark-read)
 * and the Socket.IO event handler (send message, mark-read via socket).
 */

const path = require('path');
const ConsultationMessage  = require('../models/ConsultationMessage');
const ConsultationContract = require('../models/ConsultationContract');
const Nutritionist         = require('../models/Nutritionist');
const AppError             = require('../utils/AppError');

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE     = 100;

// ── Service Class ─────────────────────────────────────────────────────────────

class ChatService {
  // ── Helper: Contract Access Guard ─────────────────────────────────────────────

  /**
   * Verify that `userId` is a valid party in contract `contractId`.
   * A valid party is either:
   *  - The customer (contract.user_id === userId), or
   *  - The nutritionist's linked user account (nutritionist.user_id === userId).
   *
   * @param {string} contractId
   * @param {string} userId  — req.user.id from JWT
   * @returns {Promise<Object>} The contract document (lean)
   * @throws {AppError} 404 if contract not found, 403 if not a party.
   */
  async assertContractAccess(contractId, userId) {
    const contract = await ConsultationContract.findById(contractId).lean();

    if (!contract) {
      throw new AppError('Consultation contract not found.', 404);
    }

    // Caller is the customer
    if (contract.user_id === userId) {
      return contract;
    }

    // Caller might be the nutritionist — resolve their linked user_id
    const nutritionist = await Nutritionist.findById(contract.nutritionist_id)
      .select('user_id')
      .lean();

    if (nutritionist && nutritionist.user_id === userId) {
      return contract;
    }

    throw new AppError('You are not a party to this consultation.', 403);
  }
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GET MESSAGE HISTORY (paginated, newest-first)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetch a page of messages for a chat room (contract).
   *
   * Pagination uses cursor-style: pass `before` (a message _id) to fetch
   * messages older than that message. If omitted, returns the newest page.
   *
   * @param {string} contractId
   * @param {string} userId     — Authenticated caller (access guard)
   * @param {number} page       — 1-based page number (for offset pagination fallback)
   * @param {number} limit      — Messages per page
   * @param {string} [before]   — Cursor: fetch messages created before this message _id
   * @returns {{ messages: Object[], total: number, hasMore: boolean }}
   */
  async getMessageHistory(contractId, userId, { page = 1, limit = DEFAULT_PAGE_SIZE, before } = {}) {
    await this.assertContractAccess(contractId, userId);

    const safePage  = Math.max(1, parseInt(page, 10));
    const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(limit, 10)));

    // Build query
    const query = { contract_id: contractId };

    if (before) {
      // Cursor-based: find the pivot message's create_at
      const pivot = await ConsultationMessage.findById(before).select('create_at').lean();
      if (pivot) {
        query.create_at = { $lt: pivot.create_at };
      }
    }

    const [messages, total] = await Promise.all([
      ConsultationMessage.find(query)
        .sort({ create_at: -1 }) // newest first (client reverses for display)
        .limit(safeLimit)
        .skip(before ? 0 : (safePage - 1) * safeLimit) // offset only when no cursor
        .lean(),
      ConsultationMessage.countDocuments({ contract_id: contractId }),
    ]);

    return {
      messages,
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: messages.length === safeLimit,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SAVE A TEXT MESSAGE (called by Socket.IO handler)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Persist a text message after validating the sender belongs to the contract.
   *
   * @param {string} contractId
   * @param {string} senderId   — req.user.id / socket.data.userId
   * @param {string} content    — The message body (trimmed)
   * @returns {Object} The saved message as a plain object
   */
  async saveTextMessage(contractId, senderId, content) {
    if (!content || !content.trim()) {
      throw new AppError('Message content cannot be empty.', 400);
    }

    const trimmed = content.trim();
    if (trimmed.length > 5000) {
      throw new AppError('Message exceeds the 5000-character limit.', 400);
    }

    await this.assertContractAccess(contractId, senderId);

    const message = await ConsultationMessage.create({
      contract_id:    contractId,
      sender_id:      senderId,
      messages_type:  'text',
      content:        trimmed,
      is_read:        false,
    });

    return message.toObject();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. UPLOAD AN IMAGE AND SAVE IMAGE MESSAGE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle a meal image upload.
   *  1. Validate the sender's access.
   *  2. Use the Cloudinary secure URL provided by multer-storage-cloudinary.
   *  3. Persist an image ConsultationMessage.
   *
   * @param {string}  contractId
   * @param {string}  senderId
   * @param {Express.Multer.File} file — The uploaded file object from multer (Cloudinary)
   * @returns {Object} The saved image message as a plain object
   */
  async uploadImageAndSaveMessage(contractId, senderId, file) {
    if (!file) {
      throw new AppError('No image file provided.', 400);
    }

    try {
      await this.assertContractAccess(contractId, senderId);

      // With Cloudinary, file.path contains the secure URL
      const imageUrl = file.path;

      const message = await ConsultationMessage.create({
        contract_id:    contractId,
        sender_id:      senderId,
        messages_type:  'image',
        content:        imageUrl,
        is_read:        false,
      });

      return message.toObject();
    } catch (error) {
      // Prevent orphan files: delete file from Cloudinary if DB fails or access denied
      // multer-storage-cloudinary sets file.filename to the public_id
      if (file.filename) {
        const { cloudinary } = require('../config/cloudinary.config');
        cloudinary.uploader.destroy(file.filename).catch(cleanupError => {
          console.error('Failed to cleanup Cloudinary asset (async):', cleanupError);
        });
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. MARK MESSAGES AS READ
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mark all unread messages in a contract as read, excluding messages sent
   * by the reader themselves (you can't "read" your own messages).
   *
   * @param {string} contractId
   * @param {string} readerUserId
   * @returns {{ modifiedCount: number }}
   */
  async markMessagesRead(contractId, readerUserId) {
    await this.assertContractAccess(contractId, readerUserId);

    const now    = new Date();
    const result = await ConsultationMessage.updateMany(
      {
        contract_id: contractId,
        sender_id:   { $ne: readerUserId }, // not sent by the reader
        is_read:     false,
      },
      {
        $set: { is_read: true, read_at: now },
      }
    );

    return { modifiedCount: result.modifiedCount };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GET ACTIVE CONTRACTS FOR NUTRITIONIST (Clients Tab)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Return all active consultation contracts for a nutritionist,
   * with the customer's basic profile populated.
   *
   * @param {string} nutritionistUserId — req.user.id (the nutritionist's User._id)
   * @returns {Object[]} Array of contract documents with user info
   */
  async getActiveContractsForNutritionist(nutritionistUserId) {
    // First, resolve the Nutritionist record from their user_id
    const nutritionist = await Nutritionist.findOne({ user_id: nutritionistUserId })
      .select('_id')
      .lean();

    if (!nutritionist) {
      throw new AppError('Nutritionist profile not found for this account.', 404);
    }

    const contracts = await ConsultationContract.find({
      nutritionist_id: nutritionist._id,
      status: 'active',
    })
      .populate({
        path: 'user_id',
        model: 'User',
        select: '_id email phone role',
      })
      .sort({ create_at: -1 })
      .lean();

    // Fetch customer profiles to enrich response with customer's full name
    const customerUserIds = contracts.map(c => c.user_id?._id || c.user_id).filter(Boolean);
    const UserProfile = require('../models/UserProfile');
    const profiles = await UserProfile.find({ user_id: { $in: customerUserIds } }).select('user_id full_name').lean();
    const profileMap = {};
    for (const p of profiles) {
      profileMap[p.user_id] = p.full_name;
    }

    // Count unread messages for all contracts in a single query to prevent N+1
    const contractIds = contracts.map(c => c._id);
    
    const unreadCounts = await ConsultationMessage.aggregate([
      {
        $match: {
          contract_id: { $in: contractIds },
          sender_id: { $ne: nutritionistUserId },
          is_read: false,
        },
      },
      {
        $group: {
          _id: '$contract_id',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    for (const item of unreadCounts) {
      unreadMap[item._id.toString()] = item.count;
    }

    const contractsWithUnread = contracts.map(contract => {
      const u = contract.user_id;
      let fullName = 'Client';
      if (u) {
        fullName = profileMap[u._id] || (u.email ? u.email.split('@')[0] : (u.phone ? u.phone : 'Client'));
      }
      return {
        ...contract,
        user_id: u ? {
          ...u,
          fullName,
        } : null,
        unread_count: unreadMap[contract._id.toString()] || 0,
      };
    });

    return contractsWithUnread;
  }
}

module.exports = new ChatService();

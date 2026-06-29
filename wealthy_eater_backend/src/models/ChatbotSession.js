const mongoose = require('mongoose');

/**
 * ChatbotSession — AI nutrition chatbot conversation history.
 *
 * Design decisions:
 *  - One active session per user at a time. When a user resets, the old
 *    session is soft-deleted (is_active = false) so history is preserved.
 *  - Messages are embedded (not a separate collection) because they are
 *    always read/written together with the session. Max 50 messages kept
 *    to prevent document bloat; older messages are trimmed on write.
 *  - Role follows Gemini API convention: 'user' | 'model'.
 *
 * Indexes:
 *  - { user_id, is_active } — fetch the active session for a user (O(1))
 *  - { user_id, updated_at: -1 } — history list sorted newest-first
 */

const MAX_MESSAGES_PER_SESSION = 50;

const ChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'model'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 8000,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // embedded sub-doc — no individual _id needed
);

const ChatbotSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    user_id: {
      type: String,
      ref: 'User',
      required: true,
    },
    // Gemini multi-turn conversation history (newest 50 messages)
    messages: {
      type: [ChatMessageSchema],
      default: [],
      validate: {
        validator: (msgs) => msgs.length <= MAX_MESSAGES_PER_SESSION,
        message: `A session cannot exceed ${MAX_MESSAGES_PER_SESSION} messages.`,
      },
    },
    // Soft-delete flag — only one active session per user
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Primary query: "get the active session for userId"
ChatbotSessionSchema.index({ user_id: 1, is_active: 1 });

// History query: "list all sessions for userId, newest first"
ChatbotSessionSchema.index({ user_id: 1, updated_at: -1 });

// ── Static constant exposed for use in service ─────────────────────────────
ChatbotSessionSchema.statics.MAX_MESSAGES = MAX_MESSAGES_PER_SESSION;

module.exports = mongoose.model('ChatbotSession', ChatbotSessionSchema);

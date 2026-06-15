const mongoose = require('mongoose');

/**
 * ConsultationMessage — Chat messages exchanged within a consultation contract.
 *
 * Fields:
 *  - contract_id   : The parent ConsultationContract (defines the private room).
 *  - sender_id     : The User who sent the message.
 *  - messages_type : 'text' | 'image' | 'system alert'
 *  - content       : Text content or image URL.
 *  - is_read       : Whether the recipient has seen this message.
 *  - read_at       : Precise timestamp of when the message was read.
 *  - create_at     : Creation timestamp (used for pagination ordering).
 */
const ConsultationMessageSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  contract_id: {
    type: String,
    ref: 'ConsultationContract',
    required: true
  },
  sender_id: {
    type: String,
    ref: 'User',
    required: true
  },
  messages_type: {
    type: String,
    enum: ['text', 'image', 'system alert'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  // ── Read Receipt ────────────────────────────────────────────────────────────
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  create_at: {
    type: Date,
    default: Date.now
  }
});

// ── Indexes ──────────────────────────────────────────────────────────────────
// Primary query: "all messages for a contract, sorted by time (newest first)"
// Supports efficient paginated history fetch for chat rooms.
ConsultationMessageSchema.index({ contract_id: 1, create_at: -1 });

// Secondary: mark-as-read query — "all unread messages in a contract not by reader"
ConsultationMessageSchema.index({ contract_id: 1, sender_id: 1, is_read: 1 });

module.exports = mongoose.model('ConsultationMessage', ConsultationMessageSchema);
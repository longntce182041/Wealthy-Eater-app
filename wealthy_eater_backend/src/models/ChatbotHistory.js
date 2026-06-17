const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isUser: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ChatbotHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  messages: [ChatMessageSchema]
}, { timestamps: true });

module.exports = mongoose.model('ChatbotHistory', ChatbotHistorySchema);

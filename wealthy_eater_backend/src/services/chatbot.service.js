const AppError = require('../utils/AppError');
const aiGatewayService = require('./ai.gateway.service');
const UserProfile = require('../models/UserProfile');
const ChatbotHistory = require('../models/ChatbotHistory');

class ChatbotService {
  async getHistory(userId) {
    const historyDoc = await ChatbotHistory.findOne({ user_id: userId });
    return historyDoc ? historyDoc.messages : [];
  }

  async processMessage(userId, message) {
    // 1. Fetch full user context from DB
    const userProfile = await UserProfile.findOne({ user_id: userId }).lean();

    // 2. Fetch existing history from DB
    let historyDoc = await ChatbotHistory.findOne({ user_id: userId });
    if (!historyDoc) {
      historyDoc = new ChatbotHistory({ user_id: userId, messages: [] });
    }

    // 3. Format history for AI, but ONLY send the last 10 messages (5 exchanges)
    // to avoid memory bloat and save Gemini API tokens.
    const aiHistory = historyDoc.messages.slice(-10).map(msg => ({
      text: msg.text,
      isUser: msg.isUser
    }));

    // 4. Ask AI
    const result = await aiGatewayService.askChatbot(message, userProfile || {}, aiHistory);

    // 5. Save to DB
    historyDoc.messages.push({ text: message, isUser: true });
    historyDoc.messages.push({ text: result.reply, isUser: false });
    
    // Limit to last 100 messages (50 exchanges) to save DB space
    if (historyDoc.messages.length > 100) {
      historyDoc.messages = historyDoc.messages.slice(historyDoc.messages.length - 100);
    }
    
    await historyDoc.save();
    return result;
  }
}

module.exports = new ChatbotService();

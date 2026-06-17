const axios = require('axios');
const AppError = require('../utils/AppError');

// Point to the Python FastAPI service port
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

class AiGatewayService {
  /**
   * Forward chat message and user constraints to the AI service
   */
  async askChatbot(message, userProfile, history = []) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/ai/chat`, {
        message,
        user_profile: userProfile,
        history
      }, {
        timeout: 45000 // 45s timeout to protect the Event Loop
      });
      return response.data; // { reply: string }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new AppError('AI Service timeout. Please try again later.', 504, 'AI_TIMEOUT');
      }
      throw new AppError(
        error.response?.data?.detail || 'Failed to communicate with AI Service',
        error.response?.status || 500,
        'AI_SERVICE_ERROR'
      );
    }
  }
}

module.exports = new AiGatewayService();

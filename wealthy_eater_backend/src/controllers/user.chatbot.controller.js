const AppError = require('../utils/AppError');
const chatbotService = require('../services/chatbot.service');

class UserChatbotController {
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await chatbotService.getHistory(userId);
      
      return res.status(200).json({
        success: true,
        data: { history },
        error: null,
      });
    } catch (error) {
      return next(error);
    }
  }

  async ask(req, res, next) {
    try {
      const userId = req.user.id;
      const { message } = req.body;

      if (!message) {
        throw new AppError('Message is required', 400, 'BAD_REQUEST');
      }

      if (message.length > 500) {
        throw new AppError('Message is too long. Max 500 characters allowed.', 400, 'BAD_REQUEST');
      }

      const result = await chatbotService.processMessage(userId, message);

      return res.status(200).json({
        success: true,
        data: result,
        error: null,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new UserChatbotController();

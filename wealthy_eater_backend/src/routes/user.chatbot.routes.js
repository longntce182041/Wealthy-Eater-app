const express = require('express');
const router = express.Router();
const userChatbotController = require('../controllers/user.chatbot.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'You have reached the limit of 20 questions per 15 minutes. Please try again later.'
    }
  }
});

router.use(authMiddleware.protect);

router.get('/history', authMiddleware.authorize('customer'), userChatbotController.getHistory);
router.post('/ask', chatbotLimiter, userChatbotController.ask);

module.exports = router;

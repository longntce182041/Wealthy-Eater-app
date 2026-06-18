const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require("../middlewares/authMiddleware");

router.get('/customer-growth', protect, authorize('admin'), analyticsController.analyzeCustomerGrowth);

router.get('/expert-performance', protect, authorize('admin'), analyticsController.evaluateExpertPerformance);

module.exports = router;
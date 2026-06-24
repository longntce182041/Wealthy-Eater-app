const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect, authorize } = require("../middlewares/authMiddleware");

//UC-57: Analyze Customer Growth 
router.get('/customer-growth', protect, authorize('admin'), analyticsController.analyzeCustomerGrowth);

//UC-58: Evaluate Expert Performance
router.get('/expert-performance', protect, authorize('admin'), analyticsController.evaluateExpertPerformance);

//UC-59: Audit Financial Trends
router.get('/financial-trends', analyticsController.getAdminFinancialTrends);

module.exports = router;
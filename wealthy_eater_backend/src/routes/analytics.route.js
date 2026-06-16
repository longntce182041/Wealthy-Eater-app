const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/customer-growth', analyticsController.analyzeCustomerGrowth);

router.get('/expert-performance', analyticsController.evaluateExpertPerformance);

module.exports = router;
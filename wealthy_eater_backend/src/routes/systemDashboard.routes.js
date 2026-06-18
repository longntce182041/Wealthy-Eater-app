const express = require('express');
const router = express.Router();
const systemDashboardController = require('../controllers/systemDashboard.controller');
const { protect, authorize } = require("../middlewares/authMiddleware");

router.get('/system-statistics', protect, authorize('admin'), systemDashboardController.getSystemStatistics);

module.exports = router;
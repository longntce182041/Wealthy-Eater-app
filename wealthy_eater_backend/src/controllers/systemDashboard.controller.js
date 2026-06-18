const systemDashboardService = require('../services/systemDashboard.service');
const AppError = require('../utils/AppError');

exports.getSystemStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Chuẩn hóa bộ lọc thời gian
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const systemStats = await systemDashboardService.getRealTimeSystemStats(start, end);

    return res.status(200).json({
      success: true,
      message: "System statistics retrieved successfully for dashboard",
      data: systemStats
    });
  } catch (error) {
    console.error("Error in getSystemStatistics controller:", error);
    return next(new AppError("Internal Server Error", 500, null, { error: error.message }));
  }
};
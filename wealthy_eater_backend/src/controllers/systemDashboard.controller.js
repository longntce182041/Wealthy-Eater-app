const systemDashboardService = require('../services/systemDashboard.service');
const AppError = require('../utils/AppError');

exports.getSystemStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Nếu không truyền query param thì gán null để lấy All-Time (toàn bộ dữ liệu)
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

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
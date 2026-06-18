const systemDashboardService = require('../services/systemDashboard.service');
const AppError = require('../utils/AppError');

exports.getSystemStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // 🎯 CHUẨN HÓA: Ép cứng chuỗi ISO Z để Node.js/MongoDB không tự ý trừ hoặc cộng lệch múi giờ local hệ điều hành
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date("2026-06-01T00:00:00.000Z");
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date("2026-06-30T23:59:59.999Z");

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
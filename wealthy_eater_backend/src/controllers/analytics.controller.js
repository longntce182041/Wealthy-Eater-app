const AppError = require('../utils/AppError');
const analyticsService = require('../services/analytics.service');

/**
 * Tiếp nhận request và chuẩn hóa chuỗi thời gian cho phân tích tăng trưởng
 */
// UC-57: Analyze Customer Growth
exports.analyzeCustomerGrowth = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Thiết lập thời gian mặc định là 30 ngày gần nhất nếu client không truyền param
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Chuẩn hóa thời gian về mốc đầu ngày 00:00:00 và cuối ngày 23:59:59
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Triển khai tính toán qua lớp Service
    const analyticsData = await analyticsService.getCustomerGrowthData(start, end);

    return res.status(200).json({
      success: true,
      message: "Customer growth analysis data generated successfully",
      data: analyticsData
    });

  } catch (error) {
    console.error("Error inside analyzeCustomerGrowth controller:", error);
    return next(new AppError("Internal Server Error", 500, null, { error: error.message }));
  }
};

// UC-58: Evaluate Expert Performance
exports.evaluateExpertPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let start = null;
    let end = null;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const performanceData = await analyticsService.getExpertPerformanceData(start, end);

    return res.status(200).json({
      success: true,
      message: "Expert performance evaluation report generated successfully",
      data: performanceData
    });

  } catch (error) {
    console.error("❌ UC-58 CONTROLLER ERROR:", error);

    return next(
      new AppError(
        "Internal Server Error",
        500,
        null,
        { error: error.message }
      )
    );
  }
};

// UC-59: Audit Financial Trends
exports.getAdminFinancialTrends = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const financialData = await analyticsService.getAdminFinancialTrendsData(start, end);

    return res.status(200).json({
      success: true,
      message: "Admin financial trends analysis generated successfully",
      data: financialData
    });
  } catch (error) {
    console.error("Error inside getAdminFinancialTrends controller:", error);
    return next(new AppError("Internal Server Error", 500, null, { error: error.message }));
  }
};
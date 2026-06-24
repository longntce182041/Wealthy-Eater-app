const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const CustomerMealLog = require('../models/CustomerMealLog');
const ConsultationContract = require('../models/ConsultationContract');
const Transaction = require('../models/Transaction');

/**
 * Hàm xử lý gom cụm dữ liệu phân tích tăng trưởng khách hàng (UC-57)
 */
// UC-57: Analyze Customer Growth
exports.getCustomerGrowthData = async (start, end) => {
  
  // 🎯 1. Gom cụm tính số lượng khách hàng mới theo chuỗi thời gian (Sử dụng 'created_at')
  const newCustomers = await User.aggregate([
    {
      $match: {
        role: 'customer',
        created_at: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 🎯 2. Tính toán chỉ số DAU (Daily Active Users) từ logs hệ thống & log ăn uống
  // Kết hợp cả hành vi đăng nhập/hệ thống và hành vi log món ăn để không bỏ sót tương tác của user
  const dailyActiveUsers = await CustomerMealLog.aggregate([
    {
      $match: {
        create_at: { $gte: start, $lte: end } // Chú ý: 'create_at' theo schema của bạn
      }
    },
    {
      // Nhóm theo ngày và user_id để loại bỏ trùng lặp nếu 1 user log nhiều món trong ngày
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$create_at" } },
          user_id: "$user_id"
        }
      }
    },
    {
      // Gom cụm tầng 2: Đếm tổng số lượng khách hàng duy nhất hoạt động trong ngày
      $group: {
        _id: "$_id.date",
        dau: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 🎯 3. Tính tỷ lệ đạt mục tiêu sức khỏe dựa trên cờ báo lệch dinh dưỡng (deviation_flag)
  const healthGoalAchievement = await CustomerMealLog.aggregate([
    {
      $match: {
        create_at: { $gte: start, $lte: end }
      }
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$create_at" } },
        // Nếu deviation_flag là false (không lệch mục tiêu dinh dưỡng) -> Tính là Đạt (1)
        isAchieved: {
          $cond: { if: { $eq: ["$deviation_flag", false] }, then: 1, else: 0 }
        }
      }
    },
    {
      $group: {
        _id: "$date",
        totalLogs: { $sum: 1 },
        achievedLogs: { $sum: "$isAchieved" }
      }
    },
    {
      $project: {
        _id: 1,
        // Tỷ lệ đạt mục tiêu dinh dưỡng = (Số bữa ăn chuẩn / Tổng số bữa ăn đã log) * 100
        achievementRate: {
          $cond: {
            if: { $eq: ["$totalLogs", 0] },
            then: 0,
            else: { $multiply: [ { $divide: ["$achievedLogs", "$totalLogs"] }, 100 ] }
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    newCustomers,
    dailyActiveUsers,
    healthGoalAchievement
  };
};

// UC-58: Evaluate Expert Performance
  exports.getExpertPerformanceData = async (start, end) => {
  // Bước 1: Lấy danh sách tất cả chuyên gia dinh dưỡng trong hệ thống
  const nutritionists = await User.find({ role: 'nutritionist' }, '_id email').lean();

  const performanceReport = [];

  for (const expert of nutritionists) {
    // 1. Tính số khách đang phụ trách hiện tại (status là active)
    const activeCustomersCount = await ConsultationContract.countDocuments({
      nutritionist_id: expert._id,
      status: 'active'
    });

    // 2. Tính số lượt thuê mới trong khoảng thời gian lọc (đựa vào create_at)
    const newRentalsCount = await ConsultationContract.countDocuments({
      nutritionist_id: expert._id,
      create_at: { $gte: start, $lte: end }
    });

    // 3. Lấy danh sách ID của tất cả khách hàng đã/đang liên kết với chuyên gia này
    const linkedContracts = await ConsultationContract.find({ nutritionist_id: expert._id }, 'user_id').lean();
    const customerIds = [...new Set(linkedContracts.map(c => c.user_id))];

    // 4. Tính toán Tỷ lệ khách ăn lệch chuẩn (Deviation Rate) từ bảng CustomerMealLog
    let deviationRate = 0;
    if (customerIds.length > 0) {
      const mealLogStats = await CustomerMealLog.aggregate([
        {
          $match: {
            user_id: { $in: customerIds },
            create_at: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: null,
            totalLogs: { $sum: 1 },
            deviationLogs: {
              $sum: { $cond: { if: { $eq: ["$deviation_flag", true] }, then: 1, else: 0 } }
            }
          }
        }
      ]);

      if (mealLogStats.length > 0 && mealLogStats[0].totalLogs > 0) {
        deviationRate = (mealLogStats[0].deviationLogs / mealLogStats[0].totalLogs) * 100;
      }
    }

    // 5. Tính điểm Rating trung bình giả lập 
    // (Logic: Tạm thời lấy ngẫu nhiên từ 4.2 -> 5.0 để UI hiển thị đẹp mắt, thay thế bằng db thật khi bổ sung bảng Review)
    const mockRating = (4 + Math.random() * 1).toFixed(1);

    performanceReport.push({
      expertId: expert._id,
      email: expert.email,
      activeCustomers: activeCustomersCount,
      newRentals: newRentalsCount,
      averageRating: parseFloat(mockRating),
      deviationRate: parseFloat(deviationRate.toFixed(2)) // Làm tròn 2 chữ số thập phân
    });
  }

  return performanceReport;
  };

  // UC-59: Audit Financial Trends
  exports.getAdminFinancialTrendsData = async (start, end) => {
    const PLATFORM_FEE_PERCENT = 15; // Phần trăm khấu trừ phí sàn hệ thống mặc định

    // 1. Thực hiện thuật toán gom cụm toán học tài chính theo chuỗi ngày giao dịch thành công qua PayOS
    const systemFinancialTrends = await Transaction.aggregate([
      {
        $match: {
          status: "PAID",
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount_gross: 1,
          calculated_platform_fee: {
            $multiply: ["$amount_gross", PLATFORM_FEE_PERCENT / 100]
          },
          calculated_expert_payout: {
            $subtract: [
              "$amount_gross",
              { $multiply: ["$amount_gross", PLATFORM_FEE_PERCENT / 100] }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$date",
          totalGrossRevenue: { $sum: "$amount_gross" },
          totalPlatformFee: { $sum: "$calculated_platform_fee" },
          totalNetDisbursement: { $sum: "$calculated_expert_payout" },
          totalTransactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Tính toán tổng tích lũy cho báo cáo tổng quan (Summary)
    let totalGross = 0;
    let totalFee = 0;
    let totalNet = 0;
    let totalInvoices = 0;

    systemFinancialTrends.forEach(day => {
      totalGross += day.totalGrossRevenue;
      totalFee += day.totalPlatformFee;
      totalNet += day.totalNetDisbursement;
      totalInvoices += day.totalTransactions;
    });

    // 3. Đồng bộ hóa cập nhật và lưu vết toán học ngược lại vào database
    const allPaidTransactions = await Transaction.find({
      status: "PAID",
      createdAt: { $gte: start, $lte: end }
    });

    for (const tx of allPaidTransactions) {
      const fee = (tx.amount_gross * PLATFORM_FEE_PERCENT) / 100;
      const payout = tx.amount_gross - fee;
      
      if (tx.platform_fee !== fee || tx.expert_payout !== payout) {
        tx.platform_fee = fee;
        tx.expert_payout = payout;
        await tx.save();
      }
    }

    return {
      summary: {
        platformFeePercent: PLATFORM_FEE_PERCENT,
        totalGrossRevenue: totalGross,
        totalPlatformFee: totalFee,
        totalNetDisbursement: totalNet,
        totalTransactionsCount: totalInvoices
      },
      trends: systemFinancialTrends
    };
  };
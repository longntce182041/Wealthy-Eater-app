const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const CustomerMealLog = require('../models/CustomerMealLog');

/**
 * Hàm xử lý gom cụm dữ liệu phân tích tăng trưởng khách hàng (UC-57)
 */
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
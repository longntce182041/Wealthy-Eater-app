const Transaction = require('../models/Transaction');

/**
 * UC-56: Thống kê chỉ số dòng tiền GMV thời gian thực cho System Dashboard
 */
exports.getRealTimeSystemStats = async (start, end) => {
  const stats = await Transaction.aggregate([
    {
      // 🎯 SỬA TẠI ĐÂY: Dùng toán tử $or để quét sạch cả 2 cách đặt tên "createdAt" và "create_at"
      $match: {
        $or: [
          { createdAt: { $gte: start, $lte: end } },
          { create_at: { $gte: start, $lte: end } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        // 1. Tổng GMV (Gồm cả PAID và PENDING)
        totalGMV: { 
          $sum: {
            $cond: [{ $in: ["$status", ["PAID", "PENDING"]] }, "$amount_gross", 0]
          }
        },
        // 2. Tính tổng doanh thu phí sàn phát sinh từ tất cả đơn để lên biểu đồ
        platformRevenue: {
          $sum: {
            $cond: [{ $in: ["$status", ["PAID", "PENDING"]] }, "$platform_fee", 0]
          }
        },
        // 3. Quỹ giải ngân cho chuyên gia
        expertPayoutPool: {
          $sum: {
            $cond: [{ $in: ["$status", ["PAID", "PENDING"]] }, "$expert_payout", 0]
          }
        },
        // 4. Các thông số vận hành đơn hàng
        totalInvoices: { $sum: 1 },
        paidInvoices: {
          $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalGMV: 1,
        platformRevenue: 1,
        expertPayoutPool: 1,
        totalInvoices: 1,
        paidInvoices: 1,
        invoiceSuccessRate: {
          $cond: {
            if: { $eq: ["$totalInvoices", 0] },
            then: 0,
            else: { 
              $round: [{ $multiply: [{ $divide: ["$paidInvoices", "$totalInvoices"] }, 100] }, 2] 
            }
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalGMV: 0,
    platformRevenue: 0,
    expertPayoutPool: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    invoiceSuccessRate: 0
  };
};
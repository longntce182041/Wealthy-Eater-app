const Transaction = require('../models/Transaction');

/**
 * UC-56: Thống kê chỉ số dòng tiền GMV thời gian thực cho System Dashboard
 */
exports.getRealTimeSystemStats = async (start, end) => {
  const stats = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        // 1. Tổng GMV (Dòng tiền lưu thông phát sinh qua hệ thống bao gồm cả PAID và PENDING)
        totalGMV: { 
          $sum: {
            $cond: [{ $in: ["$status", ["PAID", "PENDING"]] }, "$amount_gross", 0]
          }
        },
        // 2. Doanh thu thực tế của sàn (Chỉ tính trên đơn hàng đã thu tiền thành công)
        platformRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "PAID"] }, "$platform_fee", 0]
          }
        },
        // 3. Quỹ giải ngân cho chuyên gia
        expertPayoutPool: {
          $sum: {
            $cond: [{ $eq: ["$status", "PAID"] }, "$expert_payout", 0]
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
        // Tỷ lệ thanh toán hoàn tất của hệ thống
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
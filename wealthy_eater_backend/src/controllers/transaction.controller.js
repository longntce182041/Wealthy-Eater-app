const PayOS = require('@payos/node');
const Transaction = require('../models/Transaction'); // Kiểm tra đúng đường dẫn tới Model Transaction của bạn

// 🔑 Khởi tạo SDK PayOS với thông tin từ file .env
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID || '',
  process.env.PAYOS_API_KEY || '',
  process.env.PAYOS_CHECKSUM_KEY || ''
);

/**
 * ⚠️  DEPRECATED — DO NOT USE IN PRODUCTION ⚠️
 *
 * This webhook handler is INCOMPLETE. It only updates the Transaction document
 * but does NOT:
 *   - Activate the ConsultationContract (status: 'active')
 *   - Send push notifications to user/nutritionist
 *   - Use the idempotent atomic session pattern
 *
 * The canonical, production-ready PayOS webhook handler is:
 *   src/controllers/user.consultation.controller.js → handlePayOSWebhook
 *   Mounted at: POST /api/webhooks/payos (via webhook.routes.js)
 *
 * This function is kept ONLY because it is exported — transaction.routes.js
 * (which imports it) is NOT mounted in routes/index.js and must be deleted.
 */
const handlePayOSWebhook = async (req, res, next) => {
  console.error('[transaction.controller] DEPRECATED handlePayOSWebhook called! This route should not be active. Use /api/webhooks/payos instead.');
  return res.status(410).json({
    success: false,
    data: null,
    error: {
      code: 'DEPRECATED',
      message: 'This webhook endpoint is deprecated. The active PayOS webhook is POST /api/webhooks/payos.',
    },
  });
};

/**
 * ❌ 2. PAYOS CANCEL - Xử lý khi người dùng bấm Hủy thanh toán
 * Route: ALL /api/webhooks/payos/cancel
 */
const handlePayOSCancel = async (req, res, next) => {
  try {
    const orderCode = req.query.orderCode || req.body?.orderCode || req.query.id;

    if (orderCode) {
      const rawOrderCode = String(orderCode);
      await Transaction.findOneAndUpdate(
        {
          $or: [
            { payos_order_code: rawOrderCode },
            { payos_order_code: `ORD${rawOrderCode}` },
          ],
        },
        { status: 'CANCELED' }
      );
    }

    next();
  } catch (error) {
    console.error('[PayOS Cancel Error]:', error);
    next();
  }
};

/**
 * 📊 3. ADMIN TRANSACTIONS LOGS - Lấy danh sách lịch sử giao dịch toàn hệ thống
 * Route: GET /api/admin/transactions
 */
const getTransactionLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const { status, search } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search && search.trim() !== '') {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { payos_order_code: { $regex: sanitizedSearch, $options: 'i' } },
        { payos_transaction_id: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('user_id', 'fullName email avatar')
        .populate('consultation_contracts_id_fk')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        limit,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  handlePayOSWebhook,
  handlePayOSCancel,
  getTransactionLogs,
};
const PayOS = require('@payos/node');
const Transaction = require('../models/Transaction'); // Kiểm tra đúng đường dẫn tới Model Transaction của bạn

// 🔑 Khởi tạo SDK PayOS với thông tin từ file .env
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID || '',
  process.env.PAYOS_API_KEY || '',
  process.env.PAYOS_CHECKSUM_KEY || ''
);

/**
 * 📥 1. WEBHOOK PAYOS - Nhận và xử lý phản hồi tự động từ PayOS
 * Route: POST /api/webhooks/payos
 */
const handlePayOSWebhook = async (req, res, next) => {
  try {
    let webhookData = req.body;

    // 🟢 Chuyển đổi Buffer từ express.raw() thành Object JSON
    if (Buffer.isBuffer(webhookData)) {
      try {
        webhookData = JSON.parse(webhookData.toString('utf-8'));
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'INVALID_JSON',
            message: 'Webhook body is not valid JSON string.',
          },
        });
      }
    }

    if (!webhookData) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'BAD_REQUEST',
          message: 'Webhook payload is empty.',
        },
      });
    }

    // 🔒 Xác thực chữ ký Checksum qua PayOS SDK
    const verifiedData = payos.verifyPaymentWebhookData(webhookData);

    if (!verifiedData) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CHECKSUM',
          message: 'Xác thực Checksum thất bại! Dữ liệu bị chỉnh sửa hoặc sai Secret Key.',
        },
      });
    }

    const { orderCode, reference, code } = verifiedData;
    const rawOrderCode = String(orderCode);
    const isSuccess = code === '00';

    // 🔍 Tìm giao dịch trong DB
    const transaction = await Transaction.findOne({
      $or: [
        { payos_order_code: rawOrderCode },
        { payos_order_code: `ORD${rawOrderCode}` },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: `Không tìm thấy giao dịch tương ứng với mã orderCode: ${orderCode}`,
        },
      });
    }

    // 📝 Cập nhật thông tin giao dịch
    transaction.payos_transaction_id =
      reference || verifiedData.paymentLinkId || transaction.payos_transaction_id;
    transaction.status = isSuccess ? 'PAID' : 'FAILED';
    await transaction.save();

    return res.status(200).json({
      success: true,
      data: {
        orderCode: transaction.payos_order_code,
        status: transaction.status,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
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
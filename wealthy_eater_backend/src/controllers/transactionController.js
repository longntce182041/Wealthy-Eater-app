const PayOS = require('@payos/node');
const Transaction = require('../models/Transaction');

// Khởi tạo SDK PayOS với thông tin từ file môi trường .env
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * 📥 UC-82: Webhook Nhận Phản Hồi Thanh Toán Từ PayOS
 * POST /api/v1/webhooks/payos
 */
exports.handlePayOSWebhook = async (req, res) => {
  try {
    const webhookData = req.body;

    // 🔒 Step 1: Kiểm tra chữ ký số (Checksum) tự động qua SDK PayOS
    const verifiedData = payos.verifyPaymentWebhookData(webhookData);

    if (!verifiedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Xác thực Checksum thất bại! Dữ liệu Webhook không hợp lệ.' 
      });
    }

    const { orderCode, reference, code } = verifiedData;
    const rawOrderCode = String(orderCode);
    const isSuccess = code === '00';

    // 🔍 Step 2: Tìm giao dịch khớp với mã orderCode (khớp cả dạng "172839210" hoặc "ORD172839210")
    const transaction = await Transaction.findOne({
      $or: [
        { payos_order_code: rawOrderCode },
        { payos_order_code: `ORD${rawOrderCode}` }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: `Không tìm thấy giao dịch với mã orderCode: ${orderCode}` 
      });
    }

    // 📝 Step 3: Cập nhật thông tin đối soát giao dịch
    transaction.payos_transaction_id = reference || verifiedData.paymentLinkId || transaction.payos_transaction_id;
    transaction.status = isSuccess ? 'PAID' : 'FAILED';
    await transaction.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Xử lý và đối soát Webhook PayOS thành công',
      data: {
        orderCode: transaction.payos_order_code,
        status: transaction.status
      }
    });

  } catch (error) {
    console.error('Lỗi xử lý Webhook PayOS:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 📊 UC-82: Lấy Danh Sách Nhật Ký Dòng Tiền Toàn Sàn (Cho Màn Hình Admin)
 * GET /api/v1/admin/transactions
 */
exports.getTransactionLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { status, search } = req.query;

    const query = {};

    // Lọc theo trạng thái giao dịch
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Tìm kiếm tương đối theo Mã đơn hoặc Mã đối soát PayOS
    if (search) {
      query.$or = [
        { payos_order_code: { $regex: search, $options: 'i' } },
        { payos_transaction_id: { $regex: search, $options: 'i' } }
      ];
    }

    // Lấy dữ liệu và phân trang
    const transactions = await Transaction.find(query)
      .populate('user_id', 'fullName email')
      .populate('consultation_contracts_id_fk')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
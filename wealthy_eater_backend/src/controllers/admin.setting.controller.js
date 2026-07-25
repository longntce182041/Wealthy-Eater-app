const SystemSetting = require('../models/SystemSetting');

const COMMISSION_KEY = 'PLATFORM_COMMISSION_RATE';
const DEFAULT_COMMISSION_RATE = 15; // Mặc định 15% nếu chưa cài đặt trong hệ thống

/**
 * 📥 [GET] Lấy tỷ lệ chiết khấu phí sàn hiện tại
 * Route: GET /api/admin/settings/commission-rate
 */
const getCommissionRate = async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: COMMISSION_KEY });

    // Nếu chưa có cấu hình trong DB, tạo mới giá trị mặc định 15%
    if (!setting) {
      setting = await SystemSetting.create({
        key: COMMISSION_KEY,
        value: DEFAULT_COMMISSION_RATE,
        description: 'Tỷ lệ phần trăm chiết khấu phí nền tảng sàn thu giữ lại từ giao dịch thuê chuyên gia (%)'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        key: setting.key,
        commission_rate: Number(setting.value),
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching commission rate:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy cấu hình tỷ lệ chiết khấu.',
      error: error.message
    });
  }
};

/**
 * 📤 [PUT] Cập nhật tỷ lệ chiết khấu phí sàn
 * Route: PUT /api/admin/settings/commission-rate
 */
const updateCommissionRate = async (req, res) => {
  try {
    const { commission_rate } = req.body;

    // Validation dữ liệu đầu vào
    const rate = Number(commission_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tỷ lệ chiết khấu phải là một số hợp lệ từ 0% đến 100%.'
      });
    }

    // Cập nhật hoặc tạo mới vào MongoDB (Upsert)
    const setting = await SystemSetting.findOneAndUpdate(
      { key: COMMISSION_KEY },
      {
        value: rate,
        description: 'Tỷ lệ phần trăm chiết khấu phí nền tảng sàn thu giữ lại từ giao dịch thuê chuyên gia (%)',
        updated_by: req.user?._id || null
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tỷ lệ chiết khấu sàn thành công!',
      data: {
        key: setting.key,
        commission_rate: Number(setting.value),
        updatedAt: setting.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating commission rate:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật tỷ lệ chiết khấu.',
      error: error.message
    });
  }
};

// 🔴 Export tập trung các hàm controller
module.exports = {
  getCommissionRate,
  updateCommissionRate
};
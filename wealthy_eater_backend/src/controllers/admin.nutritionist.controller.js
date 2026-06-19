const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const { sendApprovalEmail, sendRejectionEmail } = require("../services/email.service");
const AppError = require('../utils/AppError');

/**
 * Escape special regex characters to prevent ReDoS.
 * Shared with admin.recipe.controller.js.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. GET NUTRITIONIST LIST (Aggregate $lookup with pipeline to handle String→ObjectId type mismatch)
async function getNutritionistsList(req, res, next) {
  try {
    const nutritionists = await Nutritionist.aggregate([
      // Bước 1: Liên kết chéo sang bảng users — dùng pipeline để ép kiểu String → ObjectId
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    '$_id',
                    { $toObjectId: '$$userId' }
                  ]
                }
              }
            }
          ],
          as: 'user_info'
        }
      },
      // Bước 2: Bóc tách mảng user_info thành một object phẳng
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true
        }
      },
      // Bước 3: Sắp xếp hồ sơ mới nhất lên đầu
      { $sort: { createdAt: -1 } }
    ]);

    const formattedData = nutritionists.map(item => ({
      id: item._id,
      email: item.user_info?.email || 'N/A',
      userStatus: item.user_info?.status || 'inactive',
      fullName: item.full_name || 'Chưa cập nhật họ tên',
      specialization: item.specialization || 'Dinh dưỡng tổng quát',
      professionalTitle: item.professional_title || 'Chuyên gia',
      licenseNumber: item.license_number || 'Chưa có số giấy phép',
      certificationUrl: item.certification_url || '',
      serviceFee: item.service_fee || 0,
      approvalStatus: item.approval_status || 'PENDING',
      averageRating: item.average_rating || 0,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
      error: null,
    });
  } catch (error) {
    // Delegate to global error handler — never leak internal error.message to client
    return next(new AppError('Failed to fetch nutritionist list.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

// 2. UPDATE APPROVAL STATUS (APPROVED / REJECTED)
async function updateApprovalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    const validStatuses = ['pending', 'approval', 'reject', 'PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      return next(new AppError('Trạng thái duyệt hồ sơ không hợp lệ.', 400, 'VALIDATION_ERROR'));
    }

    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      id,
      { approval_status: approvalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return next(new AppError('Không tìm thấy hồ sơ chuyên gia dinh dưỡng.', 404, 'NOT_FOUND'));
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt thành: ${approvalStatus}`,
      data: updatedNutritionist,
      error: null,
    });
  } catch (error) {
    return next(new AppError('Failed to update approval status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * UC-84: Verify Professional Certificates
 * PUT /api/admin/nutritionists/:id/verify
 */
async function verifyNutritionistCertificate(req, res) {
  try {
    const { id } = req.params; // ID của hồ sơ Nutritionist (dạng String)
    const { approvalStatus, rejectionReason } = req.body; 

    // 1. Kiểm tra trạng thái duyệt đầu vào
    const allowedStatuses = ["APPROVED", "REJECTED"];
    if (!allowedStatuses.includes(approvalStatus?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái phê duyệt không hợp lệ. Chỉ chấp nhận APPROVED hoặc REJECTED."
      });
    }

    // 2. Tìm kiếm hồ sơ chuyên gia
    const nutritionist = await Nutritionist.findById(id);
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ chuyên gia dinh dưỡng cần xác thực."
      });
    }

    // 3. Lấy thông tin tài khoản User gốc để lấy Email gửi thông báo
    const user = await User.findById(nutritionist.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản người dùng liên kết với hồ sơ này không tồn tại."
      });
    }

    const finalStatus = approvalStatus.toUpperCase();

    // 4. Thực hiện rẽ nhánh Logic nghiệp vụ chuyển đổi trạng thái hệ thống
    if (finalStatus === "APPROVED") {
      // 🛠️ NẾU DUYỆT THÀNH CÔNG:
      nutritionist.approval_status = "APPROVED";
      
      // Chuyển đổi trạng thái tài khoản User sang active và cập nhật vai trò thành nutritionist (nếu cần)
      user.status = "active";
      user.role = "nutritionist"; 
    } else {
      // 🛠️ NẾU TỪ CHỐI DUYỆT:
      nutritionist.approval_status = "REJECTED";
      
      // Giữ nguyên trạng thái user hoặc đưa về cấu hình an toàn của dự án bác
      user.role = "user"; // Không cấp quyền chuyên gia
    }

    // 5. Lưu đồng loạt vào Database
    await Promise.all([nutritionist.save(), user.save()]);

    // 6. Kích hoạt gửi Email thông báo tự động (Xử lý bất đồng bộ không làm chậm API)
    const userEmail = user.email;
    const displayName = nutritionist.full_name || user.name || "Chuyên gia";

    if (finalStatus === "APPROVED") {
      sendApprovalEmail(userEmail, displayName).catch(err => 
        console.error("❌ Lỗi gửi email phê duyệt:", err)
      );
    } else {
      sendRejectionEmail(userEmail, displayName, rejectionReason).catch(err => 
        console.error("❌ Lỗi gửi email từ chối:", err)
      );
    }

    // 7. Trả kết quả chuẩn Frontend
    return res.status(200).json({
      success: true,
      message: `Đã xác thực chứng chỉ chuyên môn thành công. Trạng thái: ${finalStatus}`,
      data: {
        nutritionistId: nutritionist._id,
        userId: user._id,
        approvalStatus: nutritionist.approval_status,
        userRole: user.role,
        userStatus: user.status
      }
    });

  } catch (error) {
    console.error("❌ Lỗi trong UC-84 Verify Certificate:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống trong quá trình xác thực hồ sơ chuyên môn.",
      error: error.message
    });
  }
}
// TÊN HÀM EXPORT PHẢI CHÍNH XÁC LÀ getNutritionistsList ĐỂ KHỚP VỚI FILE ROUTE
module.exports = {
  getNutritionistsList,
  updateApprovalStatus,
  verifyNutritionistCertificate
};
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const { sendApprovalEmail, sendRejectionEmail } = require("../services/email.service");

/**
 * 1. LẤY DANH SÁCH CHUYÊN GIA
 * Sử dụng Aggregate $lookup để né lỗi lệch kiểu dữ liệu String giữa các collection
 */
async function getNutritionistsList(req, res) {
  try {
    const nutritionists = await Nutritionist.aggregate([
      // Bước 1: Liên kết chéo sang bảng users — dùng pipeline để ép kiểu String → ObjectId
      {
        $lookup: {
          from: "users",          // Tên collection User trong MongoDB
          localField: "user_id",   // Trường liên kết ở bảng Nutritionist (String)
          foreignField: "_id",    // Trường khóa chính ở bảng User (String)
          as: "user_info"
        }
      },
      // Bước 2: Bóc tách mảng user_info thành một object phẳng
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true // Nếu user gốc bị ẩn/xóa, hồ sơ chuyên gia vẫn được giữ lại để đối soát
        }
      },
      // Bước 3: Sắp xếp hồ sơ đăng ký mới nhất lên đầu lên trên
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Nếu database trống, trả về mảng rỗng an toàn cho Frontend map()
    if (!nutritionists || nutritionists.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Định dạng cấu trúc dữ liệu mapping mượt mà với UI Frontend
    const formattedData = nutritionists.map(item => {
      return {
        id: item._id,
        email: item.user_info?.email || "N/A (Tài khoản ẩn/đã xóa)",
        userStatus: item.user_info?.is_active !== false ? "active" : "inactive", // Đồng bộ với trường is_active trong model User của bác
        fullName: item.full_name || "Chưa cập nhật họ tên",
        specialization: item.specialization || "Dinh dưỡng tổng quát",
        professionalTitle: item.professional_title || "Chuyên gia",
        licenseNumber: item.license_number || "Chưa có số giấy phép",
        certificationUrl: item.certification_url || "",
        serviceFee: item.service_fee || 0,
        approvalStatus: item.approval_status || "PENDING",
        averageRating: item.average_rating || 5.0,
        createdAt: item.createdAt
      };
    });

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

/**
 * 2. API DUYỆT NHANH TRẠNG THÁI HỒ SƠ CHUYÊN GIA (APPROVED / REJECTED)
 * Tích hợp cơ chế tự động nâng/hạ cấp vai trò (role) đồng bộ theo bảng User
 */
async function updateApprovalStatus(req, res) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    const validStatuses = ['pending', 'approval', 'reject', 'PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái duyệt hồ sơ không hợp lệ."
      });
    }

    const finalStatus = approvalStatus.toUpperCase();

    // 1. Cập nhật trạng thái duyệt trong bảng Nutritionist
    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      id,
      { approval_status: finalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ chuyên gia dinh dưỡng."
      });
    }

    // 2. Đồng bộ phân quyền sang bảng User dựa trên enum ['customer', 'admin', 'nutritionist']
    if (finalStatus === "APPROVED") {
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { role: "nutritionist" });
    } else if (finalStatus === "REJECTED") {
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { role: "customer" }); // Sửa từ "user" thành "customer" cho khớp enum model User của bác
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt thành: ${finalStatus}`,
      data: updatedNutritionist
    });
  } catch (error) {
    return next(new AppError('Failed to update approval status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 3. UC-84: XÁC THỰC VÀ THẨM ĐỊNH CHỨNG CHỈ CHUYÊN MÔN CHUYÊN SÂU
 * PUT /api/admin/nutritionists/:id/verify
 * Bao gồm cả lý do từ chối (rejectionReason) và gửi mail thông báo tự động cho Expert
 */
async function verifyNutritionistCertificate(req, res) {
  try {
    const { id } = req.params; // ID của hồ sơ bảng Nutritionist
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

    // 4. Rẽ nhánh logic cập nhật trạng thái hệ thống
    if (finalStatus === "APPROVED") {
      nutritionist.approval_status = "APPROVED";
      user.role = "nutritionist"; // Cấp quyền chuyên gia chính thức
    } else {
      nutritionist.approval_status = "REJECTED";
      user.role = "customer"; // 🔥 ĐÃ ĐỒNG BỘ: Chuyển về "customer" cho đúng enum mẫu User của bác (thay vì "user")
    }

    // 5. Lưu đồng bộ cả 2 bảng vào Database bằng Promise.all
    await Promise.all([nutritionist.save(), user.save()]);

    // 6. Kích hoạt dịch vụ gửi Email thông báo tự động (chạy background không gây block API)
    const userEmail = user.email;
    const displayName = nutritionist.full_name || "Chuyên gia dinh dưỡng";

    if (userEmail) {
      if (finalStatus === "APPROVED") {
        sendApprovalEmail(userEmail, displayName).catch(err => 
          console.error("❌ Lỗi gửi email phê duyệt:", err)
        );
      } else {
        sendRejectionEmail(userEmail, displayName, rejectionReason || "Hồ sơ hoặc bằng cấp chuyên môn chưa đạt yêu cầu kiểm định hệ thống.").catch(err => 
          console.error("❌ Lỗi gửi email từ chối:", err)
        );
      }
    }

    // 7. Trả kết quả chuẩn dữ liệu về cho client
    return res.status(200).json({
      success: true,
      message: `Đã xác thực chứng chỉ chuyên môn thành công. Trạng thái: ${finalStatus}`,
      data: {
        nutritionistId: nutritionist._id,
        userId: user._id,
        approvalStatus: nutritionist.approval_status,
        userRole: user.role
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

module.exports = {
  getNutritionistsList,
  updateApprovalStatus,
  verifyNutritionistCertificate
};
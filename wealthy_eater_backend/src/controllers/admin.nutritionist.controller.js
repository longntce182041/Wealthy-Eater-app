const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const { sendApprovalEmail, sendRejectionEmail } = require("../services/email.service");


// Thêm hàm tiện ích dọn ID rác ở đầu file nếu chưa có
function cleanIdParam(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  return cleanId;
}
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

/**
 * UC-85: INSPECT EXPERT PROFILE
 * GET /api/admin/nutritionists/:id
 * Lấy chi tiết hồ sơ năng lực chuyên gia kèm Bằng cấp, Lịch sử tư vấn và Đánh giá
 */
async function getNutritionistDetails(req, res) {
  try {
    const rawId = req.params.id;
    const cleanId = cleanIdParam(rawId);

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: "ID chuyên gia không hợp lệ hoặc trống."
      });
    }

    // Tiến hành kích hoạt bộ ba Pipeline liên kết dữ liệu siêu tốc
    const details = await Nutritionist.aggregate([
      // 1. Tìm đúng chuyên gia theo ID
      { $match: { _id: cleanId } },

      // 2. Lookup thông tin tài khoản (Email, Trạng thái hoạt động)
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info"
        }
      },
      { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },

      // 3. Lookup lịch sử tư vấn từ bộ sưu tập NutritionAssessment
      {
        $lookup: {
          from: "nutritionassessments",
          localField: "_id",
          foreignField: "nutritionist_id",
          as: "consultation_history"
        }
      },

      // 4. Lookup danh sách đánh giá từ cộng đồng (bảng reviews)
      {
        $lookup: {
          from: "reviews", // Tên collection chứa review của bác trong DB
          localField: "_id",
          foreignField: "nutritionist_id",
          as: "community_reviews"
        }
      }
    ]);

    // Nếu mảng trả về rỗng chứng tỏ ID không tồn tại trên hệ thống
    if (!details || details.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ năng lực của chuyên gia có ID: ${cleanId}`
      });
    }

    const expertData = details[0];

    // Định dạng dữ liệu đầu ra hoàn hảo cho UI Frontend dễ map()
    const formattedResult = {
      id: expertData._id,
      userId: expertData.user_id,
      email: expertData.user_info?.email || "N/A (Tài khoản ẩn)",
      fullName: expertData.full_name || "Chưa cập nhật họ tên",
      specialization: expertData.specialization || "Dinh dưỡng tổng quát",
      professionalTitle: expertData.professional_title || "Chuyên gia",
      licenseNumber: expertData.license_number || "Chưa cấp số",
      certificationUrl: expertData.certification_url || "", // Link ảnh bằng cấp chứng chỉ
      serviceFee: expertData.service_fee || 0,
      approvalStatus: expertData.approval_status || "PENDING",
      averageRating: expertData.average_rating || 5.0,
      createdAt: expertData.createdAt,
      
      // Mảng danh sách lịch sử tư vấn
      consultations: (expertData.consultation_history || []).map(c => ({
        id: c._id,
        diagnosis: c.diagnosis || "Chưa có chẩn đoán",
        recommendations: c.recommendations || "Chưa có khuyến nghị",
        notes: c.notes || "Không có ghi chú thêm"
      })),

      // Mảng danh sách đánh giá cộng đồng
      reviews: (expertData.community_reviews || []).map(r => ({
        id: r._id,
        reviewerName: r.reviewer_name || "Người dùng ẩn danh",
        rating: r.rating || 5,
        comment: r.comment || "Không có bình luận.",
        createdAt: r.createdAt || new Date()
      }))
    };

    return res.status(200).json({
      success: true,
      message: "Tải hồ sơ chi tiết năng lực chuyên gia thành công!",
      data: formattedResult
    });

  } catch (error) {
    console.error("❌ Lỗi tại getNutritionistDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi truy xuất chi tiết hồ sơ năng lực chuyên gia.",
      error: error.message
    });
  }
}

module.exports = {
  getNutritionistsList,
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails
};
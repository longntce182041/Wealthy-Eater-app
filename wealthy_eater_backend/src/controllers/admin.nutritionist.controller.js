const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const { sendApprovalEmail, sendRejectionEmail } = require("../services/email.service");

// Hàm tiện ích dọn ID rác ở đầu file giúp chuẩn hóa ObjectId
function cleanIdParam(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  return cleanId;
}

/**
 * 1. LẤY DANH SÁCH CHUYÊN GIA
 */
async function getNutritionistsList(req, res, next) { // <-- Đã bổ sung tham số next ở đây
  try {
    const nutritionists = await Nutritionist.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info"
        }
      },
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    if (!nutritionists || nutritionists.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const formattedData = nutritionists.map(item => {
      return {
        id: item._id,
        email: item.user_info?.email || "N/A (Tài khoản ẩn/đã xóa)",
        userStatus: item.user_info?.is_active !== false ? "active" : "inactive",
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
    console.error("❌ Lỗi getNutritionistsList:", error);
    // Tránh dùng AppError nếu chưa định nghĩa class này, trả về JSON an toàn:
    return res.status(500).json({ success: false, message: "Failed to fetch nutritionist list." });
  }
}

/**
 * 2. API DUYỆT NHANH TRẠNG THÁI HỒ SƠ CHUYÊN GIA (APPROVED / REJECTED / SUSPENDED / BANNED)
 * Tích hợp cơ chế tự động nâng/hạ cấp vai trò (role) đồng bộ theo bảng User
 */
async function updateApprovalStatus(req, res, next) { // <-- Đã bổ sung tham số next ở đây
  try {
    const rawId = req.params.id;
    const cleanId = cleanIdParam(rawId); // <-- Đã áp dụng dọn ID rác tránh lỗi 400 cực đoan

    if (!cleanId) {
      return res.status(400).json({
        success: false,
        message: "ID chuyên gia không hợp lệ."
      });
    }

    const { approvalStatus, reason } = req.body; // Lấy cả reason từ Modal kỷ luật của FE gửi lên nếu có

    // Nới rộng các trạng thái hợp lệ để khớp với tính năng Khóa tài khoản (UC-86) từ Frontend
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BANNED', 'PENDING', 'APPROVAL', 'REJECT'];
    if (!approvalStatus || !validStatuses.includes(approvalStatus.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái duyệt hoặc xử phạt hồ sơ không hợp lệ."
      });
    }

    const finalStatus = approvalStatus.toUpperCase();

    // 1. Cập nhật trạng thái duyệt trong bảng Nutritionist
    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      cleanId,
      { approval_status: finalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ chuyên gia dinh dưỡng."
      });
    }

    // 2. Đồng bộ phân quyền hoặc xử phạt sang bảng User dựa trên trạng thái mới
    if (finalStatus === "APPROVED") {
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { role: "nutritionist", is_active: true });
    } else if (["REJECTED", "SUSPENDED", "BANNED"].includes(finalStatus)) {
      // Nếu bị khóa hoặc từ chối, hạ cấp quyền và có thể khóa trạng thái active của User
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { 
        role: "customer",
        is_active: finalStatus === "APPROVED" // Tự động khóa nếu cần thiết
      }); 
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt thành: ${finalStatus}`,
      data: updatedNutritionist
    });
  } catch (error) {
    console.error("❌ Lỗi updateApprovalStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to update approval status.", error: error.message });
  }
}

/**
 * 3. UC-84: XÁC THỰC VÀ THẨM ĐỊNH CHỨNG CHỈ CHUYÊN MÔN CHUYÊN SÂU
 */
async function verifyNutritionistCertificate(req, res) {
  try {
    const rawId = req.params.id;
    const cleanId = cleanIdParam(rawId); // <-- Đã áp dụng dọn ID rác ở đây

    if (!cleanId) {
      return res.status(400).json({ success: false, message: "ID chuyên gia không hợp lệ." });
    }

    const { approvalStatus, rejectionReason } = req.body; 

    const allowedStatuses = ["APPROVED", "REJECTED"];
    if (!allowedStatuses.includes(approvalStatus?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái phê duyệt không hợp lệ. Chỉ chấp nhận APPROVED hoặc REJECTED."
      });
    }

    const nutritionist = await Nutritionist.findById(cleanId);
    if (!nutritionist) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ chuyên gia dinh dưỡng." });
    }

    const user = await User.findById(nutritionist.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Tài khoản liên kết không tồn tại." });
    }

    const finalStatus = approvalStatus.toUpperCase();

    if (finalStatus === "APPROVED") {
      nutritionist.approval_status = "APPROVED";
      user.role = "nutritionist";
    } else {
      nutritionist.approval_status = "REJECTED";
      user.role = "customer";
    }

    await Promise.all([nutritionist.save(), user.save()]);

    // Gửi mail thông báo
    const userEmail = user.email;
    const displayName = nutritionist.full_name || "Chuyên gia dinh dưỡng";

    if (userEmail) {
      if (finalStatus === "APPROVED") {
        sendApprovalEmail(userEmail, displayName).catch(err => console.error("❌ Lỗi gửi email phê duyệt:", err));
      } else {
        sendRejectionEmail(userEmail, displayName, rejectionReason || "Hồ sơ không đạt yêu cầu kiểm định.").catch(err => console.error("❌ Lỗi gửi email từ chối:", err));
      }
    }

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
    return res.status(500).json({ success: false, message: "Lỗi hệ thống trong quá trình xác thực hồ sơ.", error: error.message });
  }
}

/**
 * 4. UC-85: INSPECT EXPERT PROFILE
 */
async function getNutritionistDetails(req, res) {
  try {
    const rawId = req.params.id;
    const cleanId = cleanIdParam(rawId);

    if (!cleanId) {
      return res.status(400).json({ success: false, message: "ID chuyên gia không hợp lệ hoặc trống." });
    }

    const details = await Nutritionist.aggregate([
      { $match: { _id: cleanId } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_info"
        }
      },
      { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "nutritionassessments",
          localField: "_id",
          foreignField: "nutritionist_id",
          as: "consultation_history"
        }
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "nutritionist_id",
          as: "community_reviews"
        }
      }
    ]);

    if (!details || details.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy hồ sơ năng lực của ID: ${cleanId}` });
    }

    const expertData = details[0];

    const formattedResult = {
      id: expertData._id,
      userId: expertData.user_id,
      email: expertData.user_info?.email || "N/A (Tài khoản ẩn)",
      fullName: expertData.full_name || "Chưa cập nhật họ tên",
      specialization: expertData.specialization || "Dinh dưỡng tổng quát",
      professionalTitle: expertData.professional_title || "Chuyên gia",
      licenseNumber: expertData.license_number || "Chưa cấp số",
      certificationUrl: expertData.certification_url || "",
      serviceFee: expertData.service_fee || 0,
      approvalStatus: expertData.approval_status || "PENDING",
      averageRating: expertData.average_rating || 5.0,
      createdAt: expertData.createdAt,
      
      consultations: (expertData.consultation_history || []).map(c => ({
        id: c._id,
        diagnosis: c.diagnosis || "Chưa có chẩn đoán",
        recommendations: c.recommendations || "Chưa có khuyến nghị",
        notes: c.notes || "Không có ghi chú thêm"
      })),

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
    return res.status(500).json({ success: false, message: "Lỗi hệ thống khi truy xuất chi tiết hồ sơ.", error: error.message });
  }
}

module.exports = {
  getNutritionistsList,
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails
};
const mongoose = require("mongoose");
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { sendApprovalEmail, sendRejectionEmail } = require("../services/email.service");

// Hàm tiện ích dọn ID rác ở đầu file
function cleanIdParam(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  return cleanId;
}

/**
 * 1. UC-84: LẤY DANH SÁCH CHUYÊN GIA (CÓ ĐỒNG BỘ ID CHUẨN)
 */
async function getNutritionistsList(req, res, next) {
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
        id: item._id.toString(),
        _id: item._id.toString(),
        userId: item.user_id ? item.user_id.toString() : null,
        email: item.user_info?.email || "N/A (Tài khoản ẩn/đã xóa)",
        userStatus: item.user_info?.status || (item.user_info?.is_active === false ? "banned" : "active"), 
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
    return next(new AppError('Failed to fetch nutritionist list.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 2. GET /api/admin/nutritionists/:id
 */
async function getNutritionistById(req, res, next) {
  try {
    const { id } = req.params;
    const cleanId = cleanIdParam(id);

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      return next(new AppError(`Định dạng ID cấu trúc không hợp lệ: ${id}`, 400, 'VALIDATION_ERROR'));
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId)).lean();
    if (!nutritionist) {
      return next(new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng với ID [${cleanId}].`, 404, 'NOT_FOUND'));
    }

    const user = await User.findById(nutritionist.user_id).lean();

    const formattedDetail = {
      id: nutritionist._id.toString(),
      _id: nutritionist._id.toString(),
      userId: nutritionist.user_id ? nutritionist.user_id.toString() : null,
      email: user?.email || "N/A (Tài khoản ẩn/đã xóa)",
      userStatus: user?.status || "active",
      fullName: nutritionist.full_name || "Chưa cập nhật họ tên",
      specialization: nutritionist.specialization || "Dinh dưỡng tổng quát",
      professionalTitle: nutritionist.professional_title || "Chuyên gia",
      licenseNumber: nutritionist.license_number || "Chưa có số giấy phép",
      certificationUrl: nutritionist.certification_url || "",
      serviceFee: nutritionist.service_fee || 0,
      approvalStatus: nutritionist.approval_status || "PENDING",
      averageRating: nutritionist.average_rating || 5.0,
      createdAt: nutritionist.createdAt
    };

    return res.status(200).json({
      success: true,
      data: formattedDetail,
      error: null
    });
  } catch (error) {
    return next(new AppError(error.message || 'Lỗi hệ thống khi tải chi tiết chuyên gia.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 3. API CẬP NHẬT TRẠNG THÁI HỒ SƠ & SUSPEND/BAN CHUYÊN GIA
 */
async function updateApprovalStatus(req, res, next) {
  try {
    const rawId = req.params.id;
    const cleanId = cleanIdParam(rawId);
    const { approvalStatus, status } = req.body;

    const inputStatus = (approvalStatus || status || '').toString().toLowerCase();

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      return res.status(400).json({
        success: false,
        message: `Định dạng ID không hợp lệ: ${rawId}`
      });
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId));
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ chuyên gia dinh dưỡng có ID [${cleanId}].`
      });
    }

    // --- TRƯỜNG HỢP 1: TẠM NGƯNG TÀI KHOẢN (SUSPEND / BAN) ---
    if (['suspend', 'suspended', 'ban', 'banned'].includes(inputStatus)) {
      const userStatusTarget = inputStatus.includes('suspend') ? 'suspended' : 'banned';
      
      if (nutritionist.user_id) {
        await User.findByIdAndUpdate(nutritionist.user_id, { 
          status: userStatusTarget, 
          is_active: false 
        });
      }

      return res.status(200).json({
        success: true,
        message: `Đã tạm ngưng (Suspend) tài khoản chuyên gia thành công!`,
        data: nutritionist
      });
    }

    // --- TRƯỜNG HỢP 2: KÍCH HOẠT LẠI TÀI KHOẢN (UNSUSPEND / ACTIVE) ---
    if (inputStatus === 'active' || inputStatus === 'unsuspend') {
      if (nutritionist.user_id) {
        await User.findByIdAndUpdate(nutritionist.user_id, { 
          status: 'active', 
          is_active: true 
        });
      }

      return res.status(200).json({
        success: true,
        message: `Đã kích hoạt lại (Active) tài khoản chuyên gia thành công!`,
        data: nutritionist
      });
    }

    // --- TRƯỜNG HỢP 3: DUYỆT HỒ SƠ (APPROVED / REJECTED / PENDING) ---
    let finalStatus = 'PENDING';
    if (inputStatus.includes('appr')) finalStatus = 'APPROVED';
    if (inputStatus.includes('rej')) finalStatus = 'REJECTED';

    nutritionist.approval_status = finalStatus;
    await nutritionist.save();

    if (nutritionist.user_id) {
      if (finalStatus === "APPROVED") {
        await User.findByIdAndUpdate(nutritionist.user_id, { role: "nutritionist", status: "active", is_active: true });
      } else if (finalStatus === "REJECTED") {
        await User.findByIdAndUpdate(nutritionist.user_id, { role: "customer" }); 
      }
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt hồ sơ thành: ${finalStatus}`,
      data: nutritionist
    });

  } catch (error) {
    console.error("❌ Lỗi updateApprovalStatus:", error);
    return next(new AppError('Failed to update approval status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

/**
 * 4. UC-84: XÁC THỰC VÀ THẨM ĐỊNH CHỨNG CHỈ CHUYÊN MÔN CHUYÊN SÂU
 * (Tối ưu nhận diện action/approvalStatus & bọc try-catch Mail)
 */
async function verifyNutritionistCertificate(req, res, next) {
  try {
    const { id } = req.params; 
    const cleanId = cleanIdParam(id);
    const { action, approvalStatus, rejectionReason } = req.body; 

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      return res.status(400).json({ success: false, message: "Cấu trúc ID chuyên gia không hợp lệ." });
    }

    // Nhận diện trạng thái linh hoạt từ FE (Hỗ trợ cả 'action' và 'approvalStatus')
    const rawAction = (action || approvalStatus || '').toString().toUpperCase();
    
    let finalStatus = '';
    if (['APPROVE', 'APPROVED'].includes(rawAction)) {
      finalStatus = 'APPROVED';
    } else if (['REJECT', 'REJECTED'].includes(rawAction)) {
      finalStatus = 'REJECTED';
    } else {
      return res.status(400).json({
        success: false,
        message: "Trạng thái phê duyệt không hợp lệ. Chỉ chấp nhận APPROVE/APPROVED hoặc REJECT/REJECTED."
      });
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId));
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ chuyên gia dinh dưỡng cần xác thực với ID [${cleanId}].`
      });
    }

    const user = await User.findById(nutritionist.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản người dùng liên kết với hồ sơ này không tồn tại."
      });
    }

    // Cập nhật trạng thái kiểm duyệt và Vai trò (Role)
    if (finalStatus === "APPROVED") {
      nutritionist.approval_status = "APPROVED";
      user.role = "nutritionist"; 
      user.status = "active";
      user.is_active = true;
    } else {
      nutritionist.approval_status = "REJECTED";
      user.role = "customer"; 
    }

    await Promise.all([nutritionist.save(), user.save()]);

    // Gửi email thông báo (Bọc try-catch riêng để tránh làm gãy Response API nếu mail thất bại)
    const userEmail = user.email;
    const displayName = nutritionist.full_name || "Chuyên gia dinh dưỡng";

    if (userEmail) {
      try {
        if (finalStatus === "APPROVED") {
          await sendApprovalEmail(userEmail, displayName);
        } else {
          await sendRejectionEmail(
            userEmail, 
            displayName, 
            rejectionReason || "Hồ sơ hoặc bằng cấp chuyên môn chưa đạt yêu cầu kiểm định hệ thống."
          );
        }
      } catch (emailErr) {
        console.error("❌ [UC-84] Gửi email thông báo thất bại (Đã bỏ qua để hoàn tất Verify):", emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Đã xác thực chứng chỉ chuyên môn thành công. Trạng thái: ${finalStatus}`,
      data: {
        nutritionistId: nutritionist._id.toString(),
        userId: user._id.toString(),
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
 * 5. UC-85: INSPECT EXPERT PROFILE
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
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ năng lực của chuyên gia có ID: ${cleanId}`
      });
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
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi truy xuất chi tiết hồ sơ năng lực chuyên gia.",
      error: error.message
    });
  }
}

module.exports = {
  getNutritionistsList,
  getNutritionistById,
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails
};
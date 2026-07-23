const mongoose = require("mongoose");
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const AppError = require("../utils/AppError");
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
 * 1. UC-84: LẤY DANH SÁCH CHUYÊN GIA (CÓ ĐỒNG BỘ ID CHUẨN)
 * Sử dụng Aggregate $lookup để né lỗi lệch kiểu dữ liệu giữa các collection
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

    // Đảm bảo mapping cả trường id lẫn _id sang String cho Frontend không bị lệch pha
    const formattedData = nutritionists.map(item => {
      return {
        id: item._id.toString(),
        _id: item._id.toString(),
        userId: item.user_id ? item.user_id.toString() : null,
        email: item.user_info?.email || "N/A (Tài khoản ẩn/đã xóa)",
        userStatus: item.user_info?.status || (item.user_info?.is_active !== false ? "active" : "banned"), 
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
 * 🆕 BỔ SUNG: 2. GET /api/admin/nutritionists/:id
 * Lấy chi tiết hồ sơ một chuyên gia - Cứu cánh cho file expert-profile-detail.jsx bị 404
 */
async function getNutritionistById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Định dạng ID cấu trúc không hợp lệ: ${id}`, 400, 'VALIDATION_ERROR'));
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(id)).lean();
    if (!nutritionist) {
      return next(new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng với ID [${id}].`, 404, 'NOT_FOUND'));
    }

    // Tiện tay bốc thêm thông tin User liên kết luôn cho Frontend hiển thị
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
 * 3. API DUYỆT NHANH TRẠNG THÁI HỒ SƠ CHUYÊN GIA (APPROVED / REJECTED)
 */
async function updateApprovalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Định dạng ID cấu trúc không hợp lệ: ${id}`, 400, 'VALIDATION_ERROR'));
    }

    const validStatuses = ['pending', 'approval', 'reject', 'PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái duyệt hồ sơ không hợp lệ."
      });
    }

    const finalStatus = approvalStatus.toUpperCase();

    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      new mongoose.Types.ObjectId(id),
      { approval_status: finalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ chuyên gia dinh dưỡng có ID [${id}].`
      });
    }

    if (finalStatus === "APPROVED") {
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { role: "nutritionist" });
    } else if (finalStatus === "REJECTED") {
      await User.findByIdAndUpdate(updatedNutritionist.user_id, { role: "customer" }); 
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
 * 4. UC-84: XÁC THỰC VÀ THẨM ĐỊNH CHỨNG CHỈ CHUYÊN MÔN CHUYÊN SÂU
 */
async function verifyNutritionistCertificate(req, res, next) {
  try {
    const { id } = req.params; 
    const { approvalStatus, rejectionReason } = req.body; 

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Cấu trúc ID chuyên gia không hợp lệ." });
    }

    const allowedStatuses = ["APPROVED", "REJECTED"];
    if (!allowedStatuses.includes(approvalStatus?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái phê duyệt không hợp lệ. Chỉ chấp nhận APPROVED hoặc REJECTED."
      });
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(id));
    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy hồ sơ chuyên gia dinh dưỡng cần xác thực với ID [${id}].`
      });
    }

    const user = await User.findById(nutritionist.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Tài khoản người dùng liên kết với hồ sơ này không tồn tại."
      });
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
  getNutritionistById, // Đã xuất khẩu hàm mới ra ngoài Route
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails
};
const mongoose = require("mongoose");
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const ConsultationContract = require("../models/ConsultationContract");
const NutritionistReview = require("../models/NutritionistReview");
const { sendApprovalEmail, sendRejectionEmail } = require("./email.service");

// Helper function to sanitize ID parameter
function cleanIdParam(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  return cleanId;
}

/**
 * Get list of all nutritionists
 */
async function getAllNutritionistsService() {
  const nutritionists = await Nutritionist.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user_info"
      }
    },
    { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: -1 } }
  ]);

  if (!nutritionists || nutritionists.length === 0) return [];

  return nutritionists.map(item => {
    // Nếu có điểm số > 0 thì lấy điểm số, ngược lại trả về 0 để FE render "N/A"
    const numericRating = (item.average_rating && Number(item.average_rating) > 0) 
      ? Number(item.average_rating) 
      : 0;

    return {
      id: item._id.toString(),
      _id: item._id.toString(),
      userId: item.user_id ? item.user_id.toString() : null,
      email: item.user_info?.email || "N/A (Hidden or deleted account)",
      userStatus: item.user_info?.status || (item.user_info?.is_active === false ? "banned" : "active"),
      fullName: item.full_name || "Name not updated",
      specialization: item.specialization || "General Nutrition",
      professionalTitle: item.professional_title || "Specialist",
      licenseNumber: item.license_number || "No license number provided",
      certificationUrl: item.certification_url || "",
      about: item.about || "No self-description provided",
      serviceFee: item.service_fee || 0,
      approvalStatus: item.approval_status || "PENDING",
      averageRating: numericRating,
      createdAt: item.createdAt
    };
  });
}

/**
 * Get nutritionist details including Consultation Contracts & Nutritionist Reviews
 */
async function getNutritionistDetailService(rawId) {
  const cleanId = cleanIdParam(rawId);
  if (!cleanId) throw new Error("INVALID_ID");

  const nutritionist = await Nutritionist.findById(cleanId).lean();
  if (!nutritionist) return null;

  const user = await User.findById(nutritionist.user_id).lean();

  // 1. Query consultation history from ConsultationContract
  const contracts = await ConsultationContract.find({ nutritionist_id: cleanId })
    .sort({ create_at: -1, created_at: -1, createdAt: -1 })
    .lean();

  // Populate client details for each contract
  const formattedConsultations = await Promise.all((contracts || []).map(async (c) => {
    let clientName = "Customer";
    if (c.user_id) {
      const clientUser = await User.findById(c.user_id).select("full_name name email").lean();
      clientName = clientUser?.full_name || clientUser?.name || clientUser?.email || "Customer";
    }

    // Map package types to English labels
    const packageTypeMap = {
      '1_month': '1-Month Package',
      '3_months': '3-Month Package',
      '6_months': '6-Month Package'
    };

    // Bắt toàn bộ các biến thể tên trường ngày tháng trong DB và chuyển sang định dạng ISO String
    const rawDate = c.created_at || c.create_at || c.createdAt || c.start_date || c.startDate || c.updatedAt;

    return {
      id: c._id.toString(),
      customerName: clientName,
      date: rawDate ? new Date(rawDate).toISOString() : null,
      status: c.status || "completed",
      type: packageTypeMap[c.package_type] || c.package_type || "Nutrition Consultation"
    };
  }));

  // 2. Query community reviews from NutritionistReview
  const reviews = await NutritionistReview.find({ nutritionist_id: cleanId })
    .populate({ path: 'user_id', select: 'full_name name email' })
    .sort({ created_at: -1 })
    .lean();

  const formattedReviews = (reviews || []).map(r => ({
    id: r._id.toString(),
    customerName: r.user_id?.full_name || r.user_id?.name || "Anonymous User",
    rating: Number(r.rating) || 5,
    comment: r.review || "No detailed feedback provided.",
    date: r.created_at || r.createdAt || new Date()
  }));

  // 3. Calculate rating display logic: Chỉ trả về số khi có reviews thực tế
  const totalReviews = formattedReviews.length;
  const numericRating = (totalReviews > 0 && nutritionist.average_rating) 
    ? Number(nutritionist.average_rating) 
    : 0;

  return {
    id: nutritionist._id.toString(),
    _id: nutritionist._id.toString(),
    userId: nutritionist.user_id ? nutritionist.user_id.toString() : null,
    email: user?.email || "N/A (Hidden or deleted account)",
    userStatus: user?.status || "active",
    fullName: nutritionist.full_name || "Name not updated",
    specialization: nutritionist.specialization || "General Nutrition",
    professionalTitle: nutritionist.professional_title || "Specialist",
    licenseNumber: nutritionist.license_number || "No license number provided",
    certificationUrl: nutritionist.certification_url || "",
    about: nutritionist.about || "No self-description provided",
    serviceFee: nutritionist.service_fee || 0,
    approvalStatus: nutritionist.approval_status || "PENDING",
    averageRating: numericRating,
    createdAt: nutritionist.createdAt,
    consultations: formattedConsultations,
    reviews: formattedReviews
  };
}

/**
 * Update account status (Suspend/Active/Approve/Reject)
 */
async function updateStatusService(rawId, body) {
  const cleanId = cleanIdParam(rawId);
  if (!cleanId) throw new Error("INVALID_ID");

  const { approvalStatus, status } = body;
  const inputStatus = (approvalStatus || status || '').toString().toLowerCase();

  const nutritionist = await Nutritionist.findById(cleanId);
  if (!nutritionist) return null;

  if (['suspend', 'suspended', 'ban', 'banned'].includes(inputStatus)) {
    const userStatusTarget = inputStatus.includes('suspend') ? 'suspended' : 'banned';
    if (nutritionist.user_id) {
      await User.findByIdAndUpdate(nutritionist.user_id, { status: userStatusTarget, is_active: false });
    }
    return { nutritionist, message: "Account has been suspended successfully." };
  }

  if (['active', 'unsuspend'].includes(inputStatus)) {
    if (nutritionist.user_id) {
      await User.findByIdAndUpdate(nutritionist.user_id, { status: 'active', is_active: true });
    }
    return { nutritionist, message: "Account has been reactivated successfully." };
  }

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

  return { nutritionist, message: `Approval status updated to: ${finalStatus}` };
}

/**
 * Verify certificates and send notification email (UC-84)
 */
async function verifyCertificateService(rawId, body) {
  const cleanId = cleanIdParam(rawId);
  if (!cleanId) throw new Error("INVALID_ID");

  const { action, approvalStatus, rejectionReason } = body;
  const rawAction = (action || approvalStatus || '').toString().toUpperCase();

  let finalStatus = '';
  if (['APPROVE', 'APPROVED'].includes(rawAction)) {
    finalStatus = 'APPROVED';
  } else if (['REJECT', 'REJECTED'].includes(rawAction)) {
    finalStatus = 'REJECTED';
  } else {
    throw new Error("INVALID_ACTION");
  }

  const nutritionist = await Nutritionist.findById(cleanId);
  if (!nutritionist) return null;

  const user = await User.findById(nutritionist.user_id);
  if (!user) throw new Error("USER_NOT_FOUND");

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

  // Non-blocking email notification
  if (user.email) {
    try {
      const displayName = nutritionist.full_name || "Nutrition Specialist";
      if (finalStatus === "APPROVED") {
        await sendApprovalEmail(user.email, displayName);
      } else {
        await sendRejectionEmail(
          user.email,
          displayName,
          rejectionReason || "Your application or professional certifications did not meet our system verification standards."
        );
      }
    } catch (emailErr) {
      console.error("❌ Email sending failed:", emailErr.message);
    }
  }

  return {
    nutritionistId: nutritionist._id.toString(),
    userId: user._id.toString(),
    approvalStatus: nutritionist.approval_status,
    userRole: user.role
  };
}

module.exports = {
  cleanIdParam,
  getAllNutritionistsService,
  getNutritionistDetailService,
  updateStatusService,
  verifyCertificateService
};
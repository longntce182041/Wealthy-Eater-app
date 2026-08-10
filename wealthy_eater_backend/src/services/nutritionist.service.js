const mongoose = require("mongoose");
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");
const {
  validateNutritionistRegistration,
} = require("../validators/nutritionist.validation");
const { uploadNutritionistCertificate } = require("../config/cloudinary.config");
const { sendApprovalEmail, sendRejectionEmail } = require("./email.service");

// Import trực tiếp Review model để tránh lỗi "Schema hasn't been registered"
let Review;
try {
  Review = require("../models/Review");
} catch (e) {
  Review = null;
}

const ACTIVE_REGISTRATION_STATUSES = ["PENDING", "APPROVED"];
const APPROVED_STATUSES = ["APPROVED", "approval"];

function cleanIdParam(id) {
  if (!id) return null;
  let cleanId = String(id).trim();
  if (cleanId.includes(':')) cleanId = cleanId.split(':')[0];
  if (cleanId.startsWith(':')) cleanId = cleanId.slice(1);
  return cleanId;
}

function formatRating(avgRating, totalReviews) {
  if (!totalReviews || totalReviews === 0 || avgRating === null || avgRating === undefined) {
    return 5.0;
  }
  return Number(avgRating.toFixed(1));
}

class NutritionistService {
  async createNutritionistUserAccount(data) {
    const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data?.password === "string" ? data.password.trim() : "";

    if (!email) throw new AppError("Email is required", 400);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new AppError("Invalid email format", 400);

    if (!password) throw new AppError("Password is required", 400);
    if (password.length < 6 || password.length > 128) {
      throw new AppError("Password must be between 6 and 128 characters", 400);
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) throw new AppError("Email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await User.create({
      email,
      password_hash: passwordHash,
      role: "nutritionist",
      created_at: new Date(),
    });

    const accessToken = signAccessToken({
      sub: createdUser._id.toString(),
      email: createdUser.email,
      role: createdUser.role,
    });
    const refreshToken = signRefreshToken({ sub: createdUser._id.toString() });

    return {
      userId: createdUser._id,
      email: createdUser.email,
      role: createdUser.role,
      accessToken,
      refreshToken,
      nextStep: "Call POST /api/nutritionists/register with Bearer accessToken to configure profile",
    };
  }

  async getAllApprovedNutritionists(options = {}) {
    const page  = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
    const skip  = (page - 1) * limit;

    const [nutritionists, total] = await Promise.all([
      Nutritionist.find({ approval_status: { $in: APPROVED_STATUSES } })
        .populate("user_id", "email")
        .sort({ average_rating: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Nutritionist.countDocuments({ approval_status: { $in: APPROVED_STATUSES } }),
    ]);

    return {
      nutritionists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async registerNutritionist(userId, data, file) {
    if (!userId) throw new AppError("Unauthorized user", 401);

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (String(user.role || "").toLowerCase() !== "nutritionist") {
      throw new AppError("Only nutritionists can register as nutritionists", 403);
    }

    const payload = validateNutritionistRegistration(data, file);

    const existingRegistration = await Nutritionist.findOne({
      user_id: userId,
      approval_status: { $in: ACTIVE_REGISTRATION_STATUSES },
    }).lean();

    if (existingRegistration) {
      throw new AppError("Nutritionist registration already exists", 409);
    }

    const duplicateLicense = await Nutritionist.findOne({
      license_number: payload.licenseNumber,
    }).lean();

    if (duplicateLicense) throw new AppError("License number already exists", 409);

    const certificate = await uploadNutritionistCertificate(file, payload.certificateUrl);

    const nutritionist = await Nutritionist.create({
      user_id: userId,
      professional_title: payload.professionalTitle,
      license_number: payload.licenseNumber,
      certification_url: certificate.url,
      certificate_public_id: certificate.publicId,
      service_fee: payload.serviceFee,
      approval_status: "PENDING",
      average_rating: 0,
    });

    return {
      nutritionistId: nutritionist._id,
      approvalStatus: nutritionist.approval_status,
    };
  }

  async getNutritionistProfileByUserId(userId) {
    return await Nutritionist.findOne({ user_id: userId })
      .populate("user_id", "email phone")
      .lean();
  }

  async updateNutritionistProfileByUserId(userId, data, file) {
    let nutritionist = await Nutritionist.findOne({ user_id: userId });

    const professionalTitle = data.professionalTitle || data.professional_title;
    const licenseNumber = data.licenseNumber || data.license_number;
    const serviceFee = data.serviceFee !== undefined ? Number(data.serviceFee) : (data.service_fee !== undefined ? Number(data.service_fee) : undefined);
    const certificateUrl = data.certificateUrl || data.certification_url;
    const fullName = data.fullName || data.full_name;
    const specialization = data.specialization;
    const about = data.about;

    if (!nutritionist) {
      if (!professionalTitle) throw new AppError("Professional title is required", 400);
      if (!licenseNumber) throw new AppError("License number is required", 400);
      if (serviceFee === undefined || serviceFee <= 0) throw new AppError("Service fee must be greater than zero", 400);
      if (!file && !certificateUrl) throw new AppError("Certificate file or URL is required", 400);

      const duplicateLicense = await Nutritionist.findOne({ license_number: licenseNumber }).lean();
      if (duplicateLicense) throw new AppError("License number already exists", 409);

      const certificate = await uploadNutritionistCertificate(file, certificateUrl);

      nutritionist = await Nutritionist.create({
        user_id: userId,
        professional_title: professionalTitle,
        license_number: licenseNumber,
        certification_url: certificate.url,
        certificate_public_id: certificate.publicId,
        service_fee: serviceFee,
        full_name: fullName || "",
        specialization: specialization || "",
        about: about || "",
        approval_status: "PENDING",
        average_rating: 0,
      });
    } else {
      if (professionalTitle !== undefined) nutritionist.professional_title = professionalTitle;
      if (serviceFee !== undefined) {
        if (serviceFee <= 0) throw new AppError("Service fee must be greater than zero", 400);
        nutritionist.service_fee = serviceFee;
      }
      if (fullName !== undefined) nutritionist.full_name = fullName;
      if (specialization !== undefined) nutritionist.specialization = specialization;
      if (about !== undefined) nutritionist.about = about;

      if (licenseNumber !== undefined && licenseNumber !== nutritionist.license_number) {
        if (!licenseNumber) throw new AppError("License number cannot be empty", 400);
        const duplicateLicense = await Nutritionist.findOne({
          license_number: licenseNumber,
          user_id: { $ne: userId },
        }).lean();
        if (duplicateLicense) throw new AppError("License number already exists", 409);
        nutritionist.license_number = licenseNumber;
      }

      if (file || certificateUrl) {
        const certificate = await uploadNutritionistCertificate(file, certificateUrl);
        nutritionist.certification_url = certificate.url;
        nutritionist.certificate_public_id = certificate.publicId;
      }

      nutritionist.approval_status = "PENDING";
      await nutritionist.save();
    }

    return nutritionist;
  }

  async getMealPlanRequests(nutritionistUserId) {
    const nutritionist = await Nutritionist.findOne({ user_id: nutritionistUserId }).select("_id").lean();
    if (!nutritionist) return [];

    const MealPlanRequest = require("../models/MealPlanRequest");
    return await MealPlanRequest.find({
      nutritionist_id: nutritionist._id,
      status: "PENDING",
    })
      .populate("user_id", "email")
      .sort({ created_at: -1 })
      .lean();
  }

  async respondToMealPlanRequest(nutritionistUserId, requestId, status) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new AppError("Invalid status value. Must be APPROVED or REJECTED.", 400);
    }

    const nutritionist = await Nutritionist.findOne({ user_id: nutritionistUserId }).select("_id").lean();
    if (!nutritionist) throw new AppError("Nutritionist profile not found for this account.", 404);

    const MealPlanRequest = require("../models/MealPlanRequest");
    const request = await MealPlanRequest.findById(requestId);
    if (!request) throw new AppError("Meal plan request not found.", 404);

    if (request.nutritionist_id.toString() !== nutritionist._id.toString()) {
      throw new AppError("You do not have permission to respond to this request.", 403);
    }

    request.status = status;
    await request.save();
    return request;
  }

  // --- ADMIN METHODS ---

  async getNutritionistsList() {
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
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "nutritionist_id",
          as: "reviews_data"
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    if (!nutritionists || nutritionists.length === 0) return [];

    return nutritionists.map(item => {
      const totalReviews = item.reviews_data ? item.reviews_data.length : 0;
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
        about: item.about || "",
        serviceFee: item.service_fee || 0,
        approvalStatus: item.approval_status || "PENDING",
        averageRating: formatRating(item.average_rating, totalReviews),
        createdAt: item.createdAt
      };
    });
  }

  async getNutritionistById(rawId) {
    const cleanId = cleanIdParam(rawId);
    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      throw new AppError(`Định dạng ID cấu trúc không hợp lệ: ${rawId}`, 400);
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId)).lean();
    if (!nutritionist) {
      throw new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng với ID [${cleanId}].`, 404);
    }

    const user = await User.findById(nutritionist.user_id).lean();

    let totalReviews = 0;
    if (Review) {
      try {
        totalReviews = await Review.countDocuments({ nutritionist_id: nutritionist._id });
      } catch (e) {
        totalReviews = 0;
      }
    }

    return {
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
      about: nutritionist.about || "",
      serviceFee: nutritionist.service_fee || 0,
      approvalStatus: nutritionist.approval_status || "PENDING",
      averageRating: formatRating(nutritionist.average_rating, totalReviews),
      createdAt: nutritionist.createdAt
    };
  }

  async updateApprovalStatus(rawId, body) {
    const cleanId = cleanIdParam(rawId);
    const { approvalStatus, status } = body;
    const inputStatus = (approvalStatus || status || '').toString().toLowerCase();

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      throw new AppError(`Định dạng ID không hợp lệ: ${rawId}`, 400);
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId));
    if (!nutritionist) {
      throw new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng có ID [${cleanId}].`, 404);
    }

    if (['suspend', 'suspended', 'ban', 'banned'].includes(inputStatus)) {
      const userStatusTarget = inputStatus.includes('suspend') ? 'suspended' : 'banned';
      if (nutritionist.user_id) {
        await User.findByIdAndUpdate(nutritionist.user_id, {
          status: userStatusTarget,
          is_active: false
        });
      }
      return { message: "Đã tạm ngưng tài khoản chuyên gia thành công!", data: nutritionist };
    }

    if (inputStatus === 'active' || inputStatus === 'unsuspend') {
      if (nutritionist.user_id) {
        await User.findByIdAndUpdate(nutritionist.user_id, {
          status: 'active',
          is_active: true
        });
      }
      return { message: "Đã kích hoạt lại tài khoản chuyên gia thành công!", data: nutritionist };
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

    return { message: `Đã cập nhật trạng thái duyệt hồ sơ thành: ${finalStatus}`, data: nutritionist };
  }

  async verifyNutritionistCertificate(rawId, body) {
    const cleanId = cleanIdParam(rawId);
    const { action, approvalStatus, rejectionReason } = body;

    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      throw new AppError("Cấu trúc ID chuyên gia không hợp lệ.", 400);
    }

    const rawAction = (action || approvalStatus || '').toString().toUpperCase();
    let finalStatus = '';
    if (['APPROVE', 'APPROVED'].includes(rawAction)) {
      finalStatus = 'APPROVED';
    } else if (['REJECT', 'REJECTED'].includes(rawAction)) {
      finalStatus = 'REJECTED';
    } else {
      throw new AppError("Trạng thái phê duyệt không hợp lệ. Chỉ chấp nhận APPROVE/APPROVED hoặc REJECT/REJECTED.", 400);
    }

    const nutritionist = await Nutritionist.findById(new mongoose.Types.ObjectId(cleanId));
    if (!nutritionist) {
      throw new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng có ID [${cleanId}].`, 404);
    }

    const user = await User.findById(nutritionist.user_id);
    if (!user) {
      throw new AppError("Tài khoản người dùng liên kết với hồ sơ này không tồn tại.", 404);
    }

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

    if (user.email) {
      try {
        const displayName = nutritionist.full_name || "Chuyên gia dinh dưỡng";
        if (finalStatus === "APPROVED") {
          await sendApprovalEmail(user.email, displayName);
        } else {
          await sendRejectionEmail(
            user.email,
            displayName,
            rejectionReason || "Hồ sơ hoặc bằng cấp chuyên môn chưa đạt yêu cầu kiểm định hệ thống."
          );
        }
      } catch (emailErr) {
        console.error("❌ Gửi email thông báo thất bại:", emailErr.message);
      }
    }

    return {
      nutritionistId: nutritionist._id.toString(),
      userId: user._id.toString(),
      approvalStatus: nutritionist.approval_status,
      userRole: user.role
    };
  }

  async getNutritionistDetails(rawId) {
    const cleanId = cleanIdParam(rawId);
    if (!cleanId || !mongoose.Types.ObjectId.isValid(cleanId)) {
      throw new AppError("ID chuyên gia không hợp lệ hoặc trống.", 400);
    }

    const objId = new mongoose.Types.ObjectId(cleanId);

    const details = await Nutritionist.aggregate([
      { $match: { _id: objId } },
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
          let: { nutId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$nutritionist_id", "$$nutId"] },
                    { $eq: ["$nutritionist_id", { $toString: "$$nutId" }] }
                  ]
                }
              }
            }
          ],
          as: "consultation_history"
        }
      },
      {
        $lookup: {
          from: "reviews",
          let: { nutId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$nutritionist_id", "$$nutId"] },
                    { $eq: ["$nutritionist_id", { $toString: "$$nutId" }] }
                  ]
                }
              }
            }
          ],
          as: "community_reviews"
        }
      }
    ]);

    if (!details || details.length === 0) {
      throw new AppError(`Không tìm thấy hồ sơ năng lực của chuyên gia có ID: ${cleanId}`, 404);
    }

    const expertData = details[0];
    const totalReviews = expertData.community_reviews ? expertData.community_reviews.length : 0;

    return {
      id: expertData._id.toString(),
      _id: expertData._id.toString(),
      userId: expertData.user_id ? expertData.user_id.toString() : null,
      email: expertData.user_info?.email || "N/A (Tài khoản ẩn)",
      fullName: expertData.full_name || "Chưa cập nhật họ tên",
      specialization: expertData.specialization || "Dinh dưỡng tổng quát",
      professionalTitle: expertData.professional_title || "Chuyên gia",
      licenseNumber: expertData.license_number || "Chưa cấp số",
      certificationUrl: expertData.certification_url || "",
      about: expertData.about || "",
      serviceFee: expertData.service_fee || 0,
      approvalStatus: expertData.approval_status || "PENDING",
      averageRating: formatRating(expertData.average_rating, totalReviews),
      createdAt: expertData.createdAt,

      consultations: (expertData.consultation_history || []).map(c => ({
        id: c._id.toString(),
        diagnosis: c.diagnosis || "Chưa có chẩn đoán",
        recommendations: c.recommendations || "Chưa có khuyến nghị",
        notes: c.notes || "Không có ghi chú thêm"
      })),

      reviews: (expertData.community_reviews || []).map(r => ({
        id: r._id.toString(),
        reviewerName: r.reviewer_name || "Người dùng ẩn danh",
        rating: r.rating || 5,
        comment: r.comment || "Không có bình luận.",
        createdAt: r.createdAt || new Date()
      }))
    };
  }
}

module.exports = new NutritionistService();
const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");
const {
  validateNutritionistRegistration,
} = require("../validators/nutritionist.validation");
const { uploadNutritionistCertificate } = require("../config/cloudinary.config");

const ACTIVE_REGISTRATION_STATUSES = [
  "pending",
  "approval",
  "PENDING",
  "APPROVED",
];

class NutritionistService {
  async createNutritionistUserAccount(data) {
    const email =
      typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    const password =
      typeof data?.password === "string" ? data.password.trim() : "";

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError("Invalid email format", 400);
    }

    if (!password) {
      throw new AppError("Password is required", 400);
    }

    if (password.length < 6 || password.length > 128) {
      throw new AppError("Password must be between 6 and 128 characters", 400);
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      throw new AppError("Email already exists", 409);
    }

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
      nextStep:
        "Call POST /api/nutritionists/register with Bearer accessToken to configure nutritionist profile",
    };
  }

  /**
   * Get all approved nutritionists with optional pagination or filters
   */
  async getAllApprovedNutritionists() {
    try {
      const nutritionists = await Nutritionist.find({
        approval_status: { $in: ["approval", "APPROVED"] },
      })
        .populate("user_id", "email") // Optionally fetch user details like email if needed
        .sort({ average_rating: -1 }); // Sort by rating descending

      return nutritionists;
    } catch (error) {
      console.error("Error fetching nutritionists:", error);
      throw error;
    }
  }

  async registerNutritionist(userId, data, file) {
    if (!userId) {
      throw new AppError("Unauthorized user", 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const normalizedRole = String(user.role || "").toLowerCase();
    if (normalizedRole !== "nutritionist") {
      throw new AppError(
        "Only nutritionists can register as nutritionists",
        403,
      );
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

    if (duplicateLicense) {
      throw new AppError("License number already exists", 409);
    }

    const certificate = await uploadNutritionistCertificate(
      file,
      payload.certificateUrl,
    );

    const nutritionist = await Nutritionist.create({
      user_id: userId,
      professional_title: payload.professionalTitle,
      license_number: payload.licenseNumber,
      certification_url: certificate.url,
      certificate_public_id: certificate.publicId,
      service_fee: payload.serviceFee,
      approval_status: "PENDING",
      average_rating: 5.0,
    });

    return {
      nutritionistId: nutritionist._id,
      approvalStatus: nutritionist.approval_status,
    };
  }

  /**
   * Update a nutritionist's profile details
   */
  async updateNutritionistProfile(nutritionistId, updateData) {
    try {
      const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
        nutritionistId,
        { $set: updateData },
        { returnDocument: "after", runValidators: true },
      );
      return updatedNutritionist;
    } catch (error) {
      console.error("Error updating nutritionist profile:", error);
      throw error;
    }
  }

  /**
   * Get a nutritionist's profile by user ID
   */
  async getNutritionistProfileByUserId(userId) {
    try {
      const nutritionist = await Nutritionist.findOne({ user_id: userId })
        .populate("user_id", "email phone")
        .lean();
      return nutritionist;
    } catch (error) {
      console.error("Error fetching nutritionist profile:", error);
      throw error;
    }
  }

  /**
   * Update or create a nutritionist's profile by user ID
   */
  async updateNutritionistProfileByUserId(userId, data, file) {
    try {
      let nutritionist = await Nutritionist.findOne({ user_id: userId });

      const professionalTitle = data.professionalTitle || data.professional_title;
      const licenseNumber = data.licenseNumber || data.license_number;
      const serviceFee = data.serviceFee !== undefined ? Number(data.serviceFee) : (data.service_fee !== undefined ? Number(data.service_fee) : undefined);
      const certificateUrl = data.certificateUrl || data.certification_url;
      const fullName = data.fullName || data.full_name;
      const specialization = data.specialization;

      if (!nutritionist) {
        // Create new profile (registration)
        if (!professionalTitle) throw new AppError("Professional title is required", 400);
        if (!licenseNumber) throw new AppError("License number is required", 400);
        if (serviceFee === undefined || serviceFee <= 0) throw new AppError("Service fee must be greater than zero", 400);
        if (!file && !certificateUrl) throw new AppError("Certificate file or URL is required", 400);

        const duplicateLicense = await Nutritionist.findOne({ license_number: licenseNumber }).lean();
        if (duplicateLicense) {
          throw new AppError("License number already exists", 409);
        }

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
          approval_status: "PENDING",
          average_rating: 5.0,
        });
      } else {
        // Update existing profile
        if (professionalTitle !== undefined) nutritionist.professional_title = professionalTitle;
        if (serviceFee !== undefined) {
          if (serviceFee <= 0) throw new AppError("Service fee must be greater than zero", 400);
          nutritionist.service_fee = serviceFee;
        }
        if (fullName !== undefined) nutritionist.full_name = fullName;
        if (specialization !== undefined) nutritionist.specialization = specialization;

        if (licenseNumber !== undefined && licenseNumber !== nutritionist.license_number) {
          if (!licenseNumber) throw new AppError("License number cannot be empty", 400);
          const duplicateLicense = await Nutritionist.findOne({
            license_number: licenseNumber,
            user_id: { $ne: userId },
          }).lean();
          if (duplicateLicense) {
            throw new AppError("License number already exists", 409);
          }
          nutritionist.license_number = licenseNumber;
        }

        if (file || certificateUrl) {
          const certificate = await uploadNutritionistCertificate(file, certificateUrl);
          nutritionist.certification_url = certificate.url;
          nutritionist.certificate_public_id = certificate.publicId;
        }

        await nutritionist.save();
      }

      return nutritionist;
    } catch (error) {
      console.error("Error updating nutritionist profile:", error);
      throw error;
    }
  }

  /**
   * Get pending meal plan requests for a nutritionist.
   */
  async getMealPlanRequests(nutritionistUserId) {
    const nutritionist = await Nutritionist.findOne({ user_id: nutritionistUserId })
      .select("_id")
      .lean();

    if (!nutritionist) {
      return [];
    }

    const MealPlanRequest = require("../models/MealPlanRequest");
    const requests = await MealPlanRequest.find({
      nutritionist_id: nutritionist._id,
      status: "PENDING",
    })
      .populate("user_id", "email")
      .sort({ created_at: -1 })
      .lean();

    return requests;
  }

  /**
   * Respond to a meal plan request (Approve/Reject).
   */
  async respondToMealPlanRequest(nutritionistUserId, requestId, status) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new AppError("Invalid status value. Must be APPROVED or REJECTED.", 400);
    }

    const nutritionist = await Nutritionist.findOne({ user_id: nutritionistUserId })
      .select("_id")
      .lean();

    if (!nutritionist) {
      throw new AppError("Nutritionist profile not found for this account.", 404);
    }

    const MealPlanRequest = require("../models/MealPlanRequest");
    const request = await MealPlanRequest.findById(requestId);
    if (!request) {
      throw new AppError("Meal plan request not found.", 404);
    }

    if (request.nutritionist_id.toString() !== nutritionist._id.toString()) {
      throw new AppError("You do not have permission to respond to this request.", 403);
    }

    request.status = status;
    await request.save();

    return request;
  }
}

module.exports = new NutritionistService();

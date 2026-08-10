// controllers/nutritionist.controller.js
const nutritionistService = require("../services/nutritionist.service");

async function createAccount(req, res, next) {
  try {
    const result = await nutritionistService.createNutritionistUserAccount(req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getAllApproved(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await nutritionistService.getAllApprovedNutritionists({ page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const result = await nutritionistService.registerNutritionist(userId, req.body, req.file);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const profile = await nutritionistService.getNutritionistProfileByUserId(userId);
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const updatedProfile = await nutritionistService.updateNutritionistProfileByUserId(
      userId,
      req.body,
      req.file
    );
    return res.status(200).json({ success: true, data: updatedProfile });
  } catch (error) {
    next(error);
  }
}

async function getMealPlanRequests(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const requests = await nutritionistService.getMealPlanRequests(userId);
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

async function respondToMealPlanRequest(req, res, next) {
  try {
    const userId = req.user?.sub || req.user?._id || req.user?.id;
    const { requestId } = req.params;
    const { status } = req.body;

    const updatedRequest = await nutritionistService.respondToMealPlanRequest(
      userId,
      requestId,
      status
    );
    return res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    next(error);
  }
}

// --- ADMIN CONTROLLERS ---

async function getNutritionistsList(req, res, next) {
  try {
    const formattedData = await nutritionistService.getNutritionistsList();
    return res.status(200).json({
      success: true,
      data: formattedData,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getNutritionistById(req, res, next) {
  try {
    const formattedDetail = await nutritionistService.getNutritionistById(req.params.id);
    return res.status(200).json({
      success: true,
      data: formattedDetail,
      error: null
    });
  } catch (error) {
    next(error);
  }
}

async function updateApprovalStatus(req, res, next) {
  try {
    const result = await nutritionistService.updateApprovalStatus(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
}

async function verifyNutritionistCertificate(req, res, next) {
  try {
    const result = await nutritionistService.verifyNutritionistCertificate(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: `Đã xác thực chứng chỉ chuyên môn thành công. Trạng thái: ${result.approvalStatus}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getNutritionistDetails(req, res, next) {
  try {
    const formattedResult = await nutritionistService.getNutritionistDetails(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Tải hồ sơ chi tiết năng lực chuyên gia thành công!",
      data: formattedResult
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createAccount,
  getAllApproved,
  register,
  getMyProfile,
  updateMyProfile,
  getMealPlanRequests,
  respondToMealPlanRequest,
  getNutritionistsList,
  getNutritionistById,
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails
};
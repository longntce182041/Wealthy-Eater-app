const AppError = require("../utils/AppError");
const adminNutritionistService = require("../services/admin.nutritionist.service");

async function getNutritionistsList(req, res, next) {
  try {
    const data = await adminNutritionistService.getAllNutritionistsService();
    return res.status(200).json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    return next(new AppError('Lỗi hệ thống khi tải danh sách chuyên gia.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function getNutritionistById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await adminNutritionistService.getNutritionistDetailService(id);

    if (!data) {
      return next(new AppError(`Không tìm thấy hồ sơ chuyên gia dinh dưỡng với ID [${id}].`, 404, 'NOT_FOUND'));
    }

    return res.status(200).json({
      success: true,
      data,
      error: null
    });
  } catch (error) {
    if (error.message === "INVALID_ID") {
      return next(new AppError(`Định dạng ID không hợp lệ: ${req.params.id}`, 400, 'VALIDATION_ERROR'));
    }
    return next(new AppError(error.message || 'Lỗi hệ thống khi tải chi tiết chuyên gia.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function updateApprovalStatus(req, res, next) {
  try {
    const result = await adminNutritionistService.updateStatusService(req.params.id, req.body);

    if (!result) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chuyên gia." });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.nutritionist
    });
  } catch (error) {
    return next(new AppError('Failed to update status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

async function verifyNutritionistCertificate(req, res, next) {
  try {
    const data = await adminNutritionistService.verifyCertificateService(req.params.id, req.body);

    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chuyên gia cần xác thực." });
    }

    return res.status(200).json({
      success: true,
      message: `Đã xác thực chứng chỉ chuyên môn thành công. Trạng thái: ${data.approvalStatus}`,
      data
    });
  } catch (error) {
    if (error.message === "INVALID_ACTION") {
      return res.status(400).json({ success: false, message: "Hành động phê duyệt không hợp lệ." });
    }
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Không tìm thấy user liên kết." });
    }
    return res.status(500).json({ success: false, message: "Lỗi hệ thống trong quá trình xác thực.", error: error.message });
  }
}

module.exports = {
  getNutritionistsList,
  getNutritionistById,
  updateApprovalStatus,
  verifyNutritionistCertificate,
  getNutritionistDetails: getNutritionistById 
};
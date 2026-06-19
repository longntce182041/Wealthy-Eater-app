const Nutritionist = require("../models/Nutritionist");
const AppError = require('../utils/AppError');

/**
 * Escape special regex characters to prevent ReDoS.
 * Shared with admin.recipe.controller.js.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 1. GET NUTRITIONIST LIST (Aggregate $lookup with pipeline to handle String→ObjectId type mismatch)
async function getNutritionistsList(req, res, next) {
  try {
    const nutritionists = await Nutritionist.aggregate([
      // Bước 1: Liên kết chéo sang bảng users — dùng pipeline để ép kiểu String → ObjectId
      {
        $lookup: {
          from: 'users',
          let: { userId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    '$_id',
                    { $toObjectId: '$$userId' }
                  ]
                }
              }
            }
          ],
          as: 'user_info'
        }
      },
      // Bước 2: Bóc tách mảng user_info thành một object phẳng
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true
        }
      },
      // Bước 3: Sắp xếp hồ sơ mới nhất lên đầu
      { $sort: { createdAt: -1 } }
    ]);

    const formattedData = nutritionists.map(item => ({
      id: item._id,
      email: item.user_info?.email || 'N/A',
      userStatus: item.user_info?.status || 'inactive',
      fullName: item.full_name || 'Chưa cập nhật họ tên',
      specialization: item.specialization || 'Dinh dưỡng tổng quát',
      professionalTitle: item.professional_title || 'Chuyên gia',
      licenseNumber: item.license_number || 'Chưa có số giấy phép',
      certificationUrl: item.certification_url || '',
      serviceFee: item.service_fee || 0,
      approvalStatus: item.approval_status || 'PENDING',
      averageRating: item.average_rating || 0,
      createdAt: item.createdAt,
    }));

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

// 2. UPDATE APPROVAL STATUS (APPROVED / REJECTED)
async function updateApprovalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    const validStatuses = ['pending', 'approval', 'reject', 'PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(approvalStatus)) {
      return next(new AppError('Trạng thái duyệt hồ sơ không hợp lệ.', 400, 'VALIDATION_ERROR'));
    }

    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      id,
      { approval_status: approvalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return next(new AppError('Không tìm thấy hồ sơ chuyên gia dinh dưỡng.', 404, 'NOT_FOUND'));
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt thành: ${approvalStatus}`,
      data: updatedNutritionist,
      error: null,
    });
  } catch (error) {
    return next(new AppError('Failed to update approval status.', 500, 'INTERNAL_SERVER_ERROR'));
  }
}

module.exports = {
  getNutritionistsList,
  updateApprovalStatus
};
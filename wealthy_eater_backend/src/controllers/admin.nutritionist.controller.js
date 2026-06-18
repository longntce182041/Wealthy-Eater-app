const Nutritionist = require("../models/Nutritionist");
const User = require("../models/User");

// 1. LẤY DANH SÁCH CHUYÊN GIA (Sử dụng Aggregate $lookup để né lỗi lệch kiểu dữ liệu String)
async function getNutritionistsList(req, res) {
  try {
    const nutritionists = await Nutritionist.aggregate([
      // Bước 1: Liên kết chéo sang bảng users
      {
        $lookup: {
          from: "users",          // Tên collection User trong MongoDB của bác
          localField: "user_id",   // Trường liên kết ở bảng Nutritionist (đang dạng String)
          foreignField: "_id",    // Trường khóa chính ở bảng User
          as: "user_info"
        }
      },
      // Bước 2: Bóc tách mảng user_info thành một object phẳng
      {
        $unwind: {
          path: "$user_info",
          preserveNullAndEmptyArrays: true // Đảm bảo nếu user bị xóa thì vẫn hiển thị hồ sơ chuyên gia
        }
      },
      // Bước 3: Sắp xếp hồ sơ mới nhất lên đầu
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Nếu database trống, trả về mảng rỗng an toàn
    if (!nutritionists || nutritionists.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Định dạng lại cấu trúc dữ liệu mapping mượt mà với Frontend
    const formattedData = nutritionists.map(item => {
      return {
        id: item._id,
        email: item.user_info?.email || "N/A (Tài khoản ẩn/đã xóa)",
        userStatus: item.user_info?.status || "inactive", // Trạng thái block/active của tài khoản User gốc
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
      data: formattedData
    });

  } catch (error) {
    console.error("❌ Lỗi Aggregate Nutritionist:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi bốc tách danh sách chuyên gia",
      error: error.message
    });
  }
}

// 2. API DUYỆT HỒ SƠ CHUYÊN GIA (APPROVED / REJECTED)
async function updateApprovalStatus(req, res) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body; 

    const validStatuses = ["pending", "approval", "reject", "PENDING", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái duyệt hồ sơ không hợp lệ"
      });
    }

    const updatedNutritionist = await Nutritionist.findByIdAndUpdate(
      id,
      { approval_status: approvalStatus },
      { new: true }
    );

    if (!updatedNutritionist) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ chuyên gia dinh dưỡng"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái duyệt thành: ${approvalStatus}`,
      data: updatedNutritionist
    });
  } catch (error) {
    console.error("Error in updateApprovalStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi hệ thống khi cập nhật trạng thái duyệt",
      error: error.message
    });
  }
}

// TÊN HÀM EXPORT PHẢI CHÍNH XÁC LÀ getNutritionistsList ĐỂ KHỚP VỚI FILE ROUTE
module.exports = {
  getNutritionistsList,
  updateApprovalStatus
};
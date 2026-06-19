const express = require('express');
const router = express.Router();

// Import đầy đủ các hàm xử lý từ admin.nutritionist.controller.js
const { 
  getNutritionistsList, 
  updateApprovalStatus, 
  verifyNutritionistCertificate 
} = require('../controllers/admin.nutritionist.controller');

/**
 * 1. UC-83: View Nutritionist Directory
 * GET /api/admin/nutritionists
 * Lấy toàn bộ danh sách chuyên gia, bóc tách thông tin user phẳng để hiển thị lên bảng quản trị
 */
router.get('/', getNutritionistsList); 

/**
 * 2. API Duyệt nhanh / Cập nhật trạng thái duyệt hồ sơ
 * PUT /api/admin/nutritionists/:id/approval
 * Nhận trạng thái: PENDING / APPROVED / REJECTED và tự động chuyển đổi vai trò (role) tài khoản
 */
router.put('/:id/approval', updateApprovalStatus);

/**
 * 3. UC-84: Verify Professional Certificates
 * PUT /api/admin/nutritionists/:id/verify
 * Thẩm định chứng chỉ chuyên môn chuyên sâu, cho phép Admin điền lý do từ chối (rejectionReason) và gửi mail tự động
 */
router.put('/:id/verify', verifyNutritionistCertificate);

module.exports = router;
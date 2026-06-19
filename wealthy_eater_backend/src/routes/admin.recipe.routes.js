/**
 * Admin Recipe Routes - UC-71 to UC-76
 * Các route quản lý công thức nấu ăn trong trang quản trị
 */

const express = require('express');
const router = express.Router();

// Import Controller của bác
const AdminRecipeController = require('../controllers/admin.recipe.controller');
const { authenticateToken } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

const { uploadExcel } = require('../config/cloudinary.config');

/**
 * Middleware kiểm tra xem người dùng có phải là admin không
 */
function checkAdminRole(req, res, next) {
  // Bác bổ sung logic check role thực tế ở đây nếu cần (vd: if(req.user.role !== 'admin')...)
  next();
}

// Áp dụng xác thực (authentication) cho toàn bộ các API bên dưới
router.use(authenticateToken);
router.use(checkAdminRole);

/**
 * UC-71: GET /api/admin/recipes
 * Lấy danh sách tất cả công thức nấu ăn kèm phân trang và bộ lọc
 */
router.get('/', AdminRecipeController.getRecipesList);

/**
 * UC-73: POST /api/admin/recipes
 * Tạo công thức nấu ăn mới bằng tay (Đã được controller tự động bắt base64 để up Cloudinary)
 */
router.post('/', AdminRecipeController.addRecipe);

// =========================================================================
// 🚀 ĐẨY CÁC ROUTE ĐÍCH DANH (STATIC ROUTES) LÊN TRÊN ĐẦU ĐỂ TRÁNH LỖI 404
// =========================================================================

/**
 * 🛠️ UC-76: POST /api/admin/recipes/import-excel
 * API xử lý Import từ file Excel
 * Đã áp dụng middleware uploadExcel đồng bộ từ config
 */
router.post('/import-excel', uploadExcel.single('file'), AdminRecipeController.importRecipesExcel);

/**
 * GET /api/admin/recipes/stats
 * Lấy các số liệu thống kê chung về công thức nấu ăn
 */
router.get('/stats', AdminRecipeController.getRecipesStats);

/**
 * UC-75: GET /api/admin/recipes/search/advanced
 * API tìm kiếm nâng cao
 */
router.get('/search/advanced', AdminRecipeController.searchAndFilterRecipes);

// =========================================================================
// ⚠️ HẠ CÁC ROUTE CHỨA THAM SỐ DYNAMIC (/:id) XUỐNG DƯỚI CÙNG
// =========================================================================

/**
 * GET /api/admin/recipes/:id
 * Lấy thông tin chi tiết đầy đủ của một công thức cụ thể
 */
router.get('/:id', validateObjectId('id'), AdminRecipeController.getRecipeDetail);

/**
 * UC-74: PUT /api/admin/recipes/:id
 * Cập nhật thông tin công thức nấu ăn (Edit Recipe)
 */
router.put('/:id', validateObjectId('id'), AdminRecipeController.updateRecipe);

/**
 * UC-74: DELETE /api/admin/recipes/:id
 * Xóa mềm công thức (Soft Delete)
 */
router.delete('/:id', validateObjectId('id'), AdminRecipeController.deleteRecipe);

module.exports = router;
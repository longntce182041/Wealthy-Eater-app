/**
 * Admin Recipe Routes - UC-71: View List Recipes & UC-73: Add Recipes
 * Các route quản lý công thức nấu ăn trong trang quản trị
 */

const express = require('express');
const router = express.Router();

// Import Controller chính xác của bác
const AdminRecipeController = require('../controllers/admin.recipe.controller');
const { authenticateToken } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

// 📥 CẤU HÌNH TRUNG GIAN ĐỂ HỨNG FILE EXCEL TỪ FRONTEND
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(), // Lưu tạm file vào bộ nhớ đệm RAM để xử lý nhanh
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn tối đa file excel 10MB
});

/**
 * Middleware kiểm tra xem người dùng có phải là admin không
 */
function checkAdminRole(req, res, next) {
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
 * Tạo công thức nấu ăn mới bằng tay
 */
router.post('/', AdminRecipeController.addRecipe);

// =========================================================================
// 🚀 ĐẨY CÁC ROUTE ĐÍCH DANH (STATIC ROUTES) LÊN TRÊN ĐẦU ĐỂ TRÁNH LỖI 404
// =========================================================================

/**
 * 🛠️ UC-76: POST /api/admin/recipes/import-excel
 * API xử lý Import từ file Excel
 * Đã sửa đúng tên hàm của bác: importRecipesExcel
 */
router.post('/import-excel', upload.single('file'), AdminRecipeController.importRecipesExcel);

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
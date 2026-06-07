/**
 * Admin Recipe Routes - UC-71: View List Recipes & UC-73: Add Recipes
 * Các route quản lý công thức nấu ăn trong trang quản trị
 */

const express = require('express');
const router = express.Router();

const AdminRecipeController = require('../controllers/admin.recipe.controller');
const { authenticateToken } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

/**
 * Middleware kiểm tra xem người dùng có phải là admin không
 * (Bạn có thể điều chỉnh tùy theo cấu trúc phân quyền của hệ thống)
 */
function checkAdminRole(req, res, next) {
  // Tạm thời chỉ đang kiểm tra xem đã đăng nhập chưa
  // Bạn có thể thêm logic kiểm tra quyền (role admin) ở đây sau
  next();
}

// Áp dụng xác thực (authentication) cho tất cả các route bên dưới
router.use(authenticateToken);
router.use(checkAdminRole);

/**
 * UC-71: GET /api/admin/recipes
 * Lấy danh sách tất cả công thức nấu ăn kèm phân trang và bộ lọc
 * 
 * Các tham số truy vấn (Query Parameters):
 * - page: số trang (mặc định: 1)
 * - limit: số lượng mục trên mỗi trang (mặc định: 20, tối đa: 100)
 * - search: từ khóa tìm kiếm
 * - status: lọc theo trạng thái
 * - level: lọc theo mức độ khó
 * - minTime/maxTime: lọc theo khoảng thời gian nấu
 * - minCalories/maxCalories: lọc theo khoảng lượng calo
 * - sortBy: name_asc, name_desc, time_asc, time_desc, newest, oldest
 */
router.get('/', AdminRecipeController.getRecipesList);

/**
 * UC-73: POST /api/admin/recipes
 * Tạo công thức nấu ăn mới và tự động tính toán tổng dinh dưỡng
 */
router.post('/', AdminRecipeController.addRecipe);

/**
 * GET /api/admin/recipes/stats
 * Lấy các số liệu thống kê chung về công thức nấu ăn
 */
router.get('/stats', AdminRecipeController.getRecipesStats);

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
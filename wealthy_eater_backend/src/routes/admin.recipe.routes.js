/**
 * Admin Recipe Routes - UC-71 to UC-76
 */

const express = require('express');
const router = express.Router();

const AdminRecipeController = require('../controllers/admin.recipe.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const validateObjectId = require('../middlewares/validateObjectId');

// Import config cloudinary (Hỗ trợ tự lấy uploadImage, uploadSingle hoặc upload)
const cloudinaryConfig = require('../config/cloudinary.config');
const uploadExcel = cloudinaryConfig.uploadExcel;
const uploadImage = cloudinaryConfig.uploadImage || cloudinaryConfig.uploadSingle || cloudinaryConfig.upload || cloudinaryConfig.uploadExcel;

// Áp dụng xác thực Token
router.use(authenticateToken);

// 🟢 Middleware check Admin linh hoạt (Chấp nhận cả 'admin', 'ADMIN', 'Admin')
router.use((req, res, next) => {
  const userRole = req.user?.role?.toLowerCase();
  if (userRole === 'admin' || req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Truy cập bị từ chối: Bạn không có quyền Admin!'
  });
});

// =========================================================================
// 🚀 1. CÁC ROUTE ĐÍCH DANH (STATIC ROUTES)
// =========================================================================

/**
 * UC-71: GET /api/admin/recipes
 */
router.get('/', AdminRecipeController.getRecipesList);

/**
 * UC-73: POST /api/admin/recipes
 */
router.post('/', AdminRecipeController.addRecipe);

/**
 * 📸 POST /api/admin/recipes/upload-image
 * Route upload ảnh món ăn trực tiếp lên Cloudinary
 */
router.post('/upload-image', uploadImage.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh hợp lệ!' });
    }

    // Lấy đường dẫn URL trả về từ Cloudinary
    const imageUrl = req.file.path || req.file.secure_url;

    return res.status(200).json({
      success: true,
      message: 'Upload ảnh thành công!',
      data: {
        url: imageUrl
      },
      url: imageUrl
    });
  } catch (error) {
    console.error('Error in recipe image upload:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi upload ảnh!'
    });
  }
});

/**
 * 🛠️ UC-76: POST /api/admin/recipes/import-excel
 */
router.post('/import-excel', uploadExcel.single('file'), AdminRecipeController.importRecipesExcel);

/**
 * GET /api/admin/recipes/stats
 */
router.get('/stats', AdminRecipeController.getRecipesStats);

/**
 * UC-75: GET /api/admin/recipes/search/advanced
 */
router.get('/search/advanced', AdminRecipeController.searchAndFilterRecipes);

// =========================================================================
// ⚠️ 2. CÁC ROUTE CHỨA THAM SỐ DYNAMIC (/:id)
// =========================================================================

/**
 * GET /api/admin/recipes/:id
 */
router.get('/:id', validateObjectId('id'), AdminRecipeController.getRecipeDetail);

/**
 * UC-74: PUT /api/admin/recipes/:id
 */
router.put('/:id', validateObjectId('id'), AdminRecipeController.updateRecipe);

/**
 * UC-74: DELETE /api/admin/recipes/:id
 */
router.delete('/:id', validateObjectId('id'), AdminRecipeController.deleteRecipe);

module.exports = router;
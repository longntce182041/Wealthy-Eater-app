/**
 * Admin Recipe Controller - UC-71 to UC-76
 * API para listar, criar, editar, deletar e importar receitas do sistema com paginação e filtros
 */

const AppError = require('../utils/AppError');
const adminRecipeService = require('../services/admin.recipe.service');

/**
 * UC-71: GET /api/admin/recipes
 */
async function getRecipesList(req, res, next) {
  try {
    const result = await adminRecipeService.getRecipesList(req.query);
    return res.json({ 
      success: true, 
      message: result.data.length === 0 ? 'No recipes found' : 'Recipes loaded successfully', 
      data: result.data, 
      meta: result.meta,
      error: null
    });
  } catch (err) {
    console.error('❌ Error fetching recipes:', err);
    return next(new AppError(err.message || 'Failed to load recipes', 500, null, process.env.NODE_ENV === 'development' ? err.stack : undefined));
  }
}

/**
 * UC-71: GET /api/admin/recipes/stats
 */
async function getRecipesStats(req, res, next) {
  try {
    const stats = await adminRecipeService.getRecipesStats();
    return res.json({ success: true, message: 'Stats loaded successfully', data: stats, error: null });
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    return next(new AppError(err.message || 'Failed to load stats', 500));
  }
}

/**
 * GET /api/admin/recipes/:id 
 */
async function getRecipeDetail(req, res, next) {
  try {
    const data = await adminRecipeService.getRecipeDetail(req.params.id);
    return res.json({ success: true, message: 'Recipe loaded successfully', data, error: null });
  } catch (err) {
    console.error('❌ Error fetching recipe detail:', err);
    return next(new AppError(err.message || 'Failed to load recipe', 500));
  }
}

/**
 * UC-73: POST /api/admin/recipes
 */
async function addRecipe(req, res, next) {
  try {
    const responseData = await adminRecipeService.addRecipe(req.body);
    return res.status(201).json({ success: true, message: 'Tạo công thức thành công!', data: responseData, error: null });
  } catch (err) {
    console.error('❌ Error adding recipe:', err);
    return next(new AppError(err.message || 'Tạo công thức thất bại.', 500));
  }
}

/**
 * UC-74: PUT /api/admin/recipes/:id
 */
async function updateRecipe(req, res, next) {
  try {
    const responseData = await adminRecipeService.updateRecipe(req.params.id, req.body);
    return res.json({ success: true, message: 'Cập nhật công thức thành công!', data: responseData, error: null });
  } catch (err) {
    console.error('❌ Error updating recipe:', err);
    return next(new AppError(err.message || 'Cập nhật công thức thất bại.', 500));
  }
}

/**
 * UC-74: DELETE /api/admin/recipes/:id
 */
async function deleteRecipe(req, res, next) {
  try {
    await adminRecipeService.deleteRecipe(req.params.id);
    return res.json({ success: true, message: 'Đã xóa mềm công thức thành công.', data: null, error: null });
  } catch (err) {
    console.error('❌ Error deleting recipe:', err);
    return next(new AppError(err.message || 'Xóa công thức thất bại.', 500));
  }
}

/**
 * UC-75: GET /api/recipes (User search)
 */
async function searchAndFilterRecipes(req, res, next) {
  try {
    const result = await adminRecipeService.searchAndFilterRecipes(req.query);
    return res.json({ 
      success: true, 
      message: 'Tìm kiếm thành công!', 
      pagination: result.pagination, 
      data: result.data,
      error: null
    });
  } catch (err) {
    console.error('❌ Error in Search/Filter Recipes:', err);
    return next(new AppError(err.message || 'Xảy ra lỗi trong quá trình tìm kiếm công thức.', 500));
  }
}

/**
 * UC-76: POST /api/admin/recipes/import-excel
 */
async function importRecipesExcel(req, res, next) {
  try {
    if (!req.file) {
      return next(new AppError('Vui lòng cung cấp tệp Excel (.xlsx hoặc .xls).', 400));
    }
    const data = await adminRecipeService.importRecipesExcel(req.file.buffer);
    return res.status(201).json({ success: true, message: 'Import thành công!', data, error: null });
  } catch (err) {
    console.error('❌ Error Importing Excel Recipes:', err);
    if (err instanceof AppError) {
      return next(err);
    }
    return next(new AppError(err.message || 'Xảy ra lỗi hệ thống khi nhập dữ liệu tệp Excel.', 500));
  }
}

module.exports = {
  getRecipesList, getRecipesStats, getRecipeDetail, addRecipe, updateRecipe, deleteRecipe, searchAndFilterRecipes, importRecipesExcel
};
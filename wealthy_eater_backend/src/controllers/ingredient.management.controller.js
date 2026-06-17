// src/api/controllers/ingredient.management.controller.js
const AppError = require('../utils/AppError');
const ingredientService = require("../services/ingredient.management.service");
const { validateIngredient } = require("../validators/ingredient.management.validators");

class IngredientManagementController {
    // GET /api/ingredients
    async getIngredients(req, res, next) {
        try {
            const result = await ingredientService.getAllIngredients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            return next(new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR'));
        }
    }

    // GET /api/ingredients/:id
    async getIngredientDetail(req, res, next) {
        try {
            const ingredient = await ingredientService.getIngredientById(req.params.id);
            res.json({ success: true, data: ingredient });
        } catch (error) {
            return next(new AppError(error.message, 404, 'INGREDIENT_NOT_FOUND'));
        }
    }

    // POST /api/ingredients/create
    async createIngredient(req, res, next) {
        try {
            // Validate input
            const { errors, isValid } = validateIngredient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors));

            const newIngredient = await ingredientService.createIngredient(req.body);
            res.status(201).json({ success: true, data: newIngredient, error: null });
        } catch (error) {
            return next(new AppError(error.message, 400, 'CREATION_FAILED'));
        }
    }

    // PUT /api/ingredients/:id
    async updateIngredient(req, res, next) {
        try {
            // Validate sơ bộ (nếu cần thiết có thể dùng hàm validate riêng cho update)
            const updatedIngredient = await ingredientService.updateIngredient(req.params.id, req.body);
            res.json({ success: true, data: updatedIngredient, error: null });
        } catch (error) {
            return next(new AppError(error.message, 400, 'UPDATE_FAILED'));
        }
    }

    // DELETE /api/ingredients/:id
    async deleteIngredient(req, res, next) {
        try {
            await ingredientService.deleteIngredient(req.params.id);
            res.json({ success: true, data: null, error: null });
        } catch (error) {
            return next(new AppError(error.message, 400, 'DELETE_FAILED'));
        }
    }

    // POST /api/ingredients/import
    async importIngredients(req, res, next) {
        try {
            if (!req.file) {
                return next(new AppError("Please upload an Excel file", 400, 'FILE_MISSING'));
            }

            // Gọi service xử lý file bằng pipeline stream buffer
            const result = await ingredientService.importIngredientsFromExcel(req.file.buffer);

            res.status(200).json({
                success: true,
                message: "Ingredients imported successfully",
                data: {
                    upserted: result.insertedCount,
                    updated: result.modifiedCount
                },
                error: null
            });
        } catch (error) {
            // Trả về báo cáo lỗi chi tiết từng dòng cho Admin nếu có
            if (error.details) {
                return next(new AppError(error.message, 400, 'IMPORT_FAILED', error.details));
            }
            return next(new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR'));
        }
    }
}

module.exports = new IngredientManagementController();
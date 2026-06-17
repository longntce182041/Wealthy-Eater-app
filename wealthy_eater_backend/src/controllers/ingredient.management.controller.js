// src/api/controllers/ingredient.management.controller.js
const AppError = require('../utils/AppError');
const ingredientService = require("../services/ingredient.management.service");
const { validateIngredient } = require("../validators/ingredient.management.validators");

class IngredientManagementController {
    // GET /api/ingredients
    async getIngredients(req, res) {
        try {
            const result = await ingredientService.getAllIngredients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            return next(new AppError(error.message, 500));
        }
    }

    // GET /api/ingredients/:id
    async getIngredientDetail(req, res) {
        try {
            const ingredient = await ingredientService.getIngredientById(req.params.id);
            res.json({ success: true, data: ingredient });
        } catch (error) {
            return next(new AppError(error.message, 404));
        }
    }

    // POST /api/ingredients/create
    async createIngredient(req, res) {
        try {
            // Validate input
            const { errors, isValid } = validateIngredient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, errors));

            const newIngredient = await ingredientService.createIngredient(req.body);
            const message = getActionMessage('create', 'Ingredient');
            res.status(201).json({ success: true, message, data: newIngredient });
        } catch (error) {
            return next(new AppError(error.message, 400));
        }
    }

    // PUT /api/ingredients/:id
    async updateIngredient(req, res) {
        try {
            // Validate sơ bộ (nếu cần thiết có thể dùng hàm validate riêng cho update)
            const updatedIngredient = await ingredientService.updateIngredient(req.params.id, req.body);
            const message = getActionMessage('update', 'Ingredient');
            res.json({ success: true, message, data: updatedIngredient });
        } catch (error) {
            return next(new AppError(error.message, 400));
        }
    }

    // DELETE /api/ingredients/:id
    async deleteIngredient(req, res) {
        try {
            await ingredientService.deleteIngredient(req.params.id);
            const message = getActionMessage('delete', 'Ingredient');
            res.json({ success: true, message });
        } catch (error) {
            return next(new AppError(error.message, 400));
        }
    }

    // POST /api/ingredients/import
    async importIngredients(req, res) {
        try {
            if (!req.file) {
                return next(new AppError("Please upload an Excel file", 400));
            }

            // Gọi service xử lý file bằng pipeline stream buffer
            const result = await ingredientService.importIngredientsFromExcel(req.file.buffer);

            res.status(200).json({
                success: true,
                message: "Ingredients imported successfully",
                data: {
                    upserted: result.insertedCount,
                    updated: result.modifiedCount
                }
            });
        } catch (error) {
            // Trả về báo cáo lỗi chi tiết từng dòng cho Admin nếu có
            if (error.details) {
                return next(new AppError(error.message, 400, null, error.details));
            }
            return next(new AppError(error.message, 500));
        }
    }
}

module.exports = new IngredientManagementController();
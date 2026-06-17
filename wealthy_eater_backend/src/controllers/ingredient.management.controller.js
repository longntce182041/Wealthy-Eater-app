const AppError = require('../utils/AppError');
const ingredientService = require("../services/ingredient.management.service");
const { validateIngredient } = require("../validators/ingredient.management.validators");

const getActionMessage = (action, modelName) => {
    const messages = {
        create: `${modelName} created successfully`,
        update: `${modelName} updated successfully`,
        delete: `${modelName} deleted successfully`
    };
    return messages[action] || `${modelName} processed successfully`;
};

class IngredientManagementController {
    async getIngredients(req, res, next) { 
        try {
            const result = await ingredientService.getAllIngredients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("🔥 Error in getIngredients:", error);
            return next(new AppError(error.message, 500));
        }
    }

    async getIngredientDetail(req, res, next) {
        try {
            const ingredient = await ingredientService.getIngredientById(req.params.id);
            res.json({ success: true, data: ingredient });
        } catch (error) {
            console.error("🔥 Error in getIngredientDetail:", error);
            return next(new AppError(error.message, 404));
        }
    }

    // 🎯 SỬA HÀM CREATE
    async createIngredient(req, res, next) {
        try {
            // FormData ép kiểu Array thành String "[...]", cần chuyển đổi ngược lại
            if (req.body.micronutrients && typeof req.body.micronutrients === 'string') {
                try {
                    req.body.micronutrients = JSON.parse(req.body.micronutrients);
                } catch (e) {
                    req.body.micronutrients = [];
                }
            }

            // Đồng bộ ép kiểu dữ liệu số về Number do FormData chuyển tất cả thành chuỗi Text
            req.body.calories_per_unit = Number(req.body.calories_per_unit) || 0;
            req.body.protein = Number(req.body.protein) || 0;
            req.body.carbs = Number(req.body.carbs) || 0;
            req.body.fat = Number(req.body.fat) || 0;

            const { errors, isValid } = validateIngredient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, errors));

            // Truyền cả req.body và file ảnh req.file xuống Service
            const newIngredient = await ingredientService.createIngredient(req.body, req.file);
            const message = getActionMessage('create', 'Ingredient');
            res.status(201).json({ success: true, message, data: newIngredient });
        } catch (error) {
            console.error("🔥 Error in createIngredient:", error);
            return next(new AppError(error.message, 400));
        }
    }

    // 🎯 SỬA HÀM UPDATE
    async updateIngredient(req, res, next) {
        try {
            if (req.body.micronutrients && typeof req.body.micronutrients === 'string') {
                try {
                    req.body.micronutrients = JSON.parse(req.body.micronutrients);
                } catch (e) {
                    req.body.micronutrients = [];
                }
            }

            if (req.body.calories_per_unit !== undefined) req.body.calories_per_unit = Number(req.body.calories_per_unit) || 0;
            if (req.body.protein !== undefined) req.body.protein = Number(req.body.protein) || 0;
            if (req.body.carbs !== undefined) req.body.carbs = Number(req.body.carbs) || 0;
            if (req.body.fat !== undefined) req.body.fat = Number(req.body.fat) || 0;

            const updatedIngredient = await ingredientService.updateIngredient(req.params.id, req.body, req.file);
            const message = getActionMessage('update', 'Ingredient');
            res.json({ success: true, message, data: updatedIngredient });
        } catch (error) {
            console.error("🔥 Error in updateIngredient:", error);
            return next(new AppError(error.message, 400));
        }
    }

    async deleteIngredient(req, res, next) {
        try {
            await ingredientService.deleteIngredient(req.params.id);
            const message = getActionMessage('delete', 'Ingredient');
            res.json({ success: true, message });
        } catch (error) {
            console.error("🔥 Error in deleteIngredient:", error);
            return next(new AppError(error.message, 400));
        }
    }

    async importIngredients(req, res, next) {
        try {
            if (!req.file) return next(new AppError("Please upload an Excel file", 400));
            const result = await ingredientService.importIngredientsFromExcel(req.file.buffer);
            res.status(200).json({
                success: true,
                message: "Ingredients imported successfully",
                data: { upserted: result.insertedCount, updated: result.modifiedCount }
            });
        } catch (error) {
            console.error("🔥 Error in importIngredients:", error);
            if (error.details) return next(new AppError(error.message, 400, null, error.details));
            return next(new AppError(error.message, 500));
        }
    }
}

module.exports = new IngredientManagementController();
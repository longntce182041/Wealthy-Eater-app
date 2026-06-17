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
    
    // ==========================================
    // 🔍 [GET] LẤY DANH SÁCH NGUYÊN LIỆU (PHÂN TRANG)
    // ==========================================
    async getIngredients(req, res, next) { 
        try {
            const result = await ingredientService.getAllIngredients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("🔥 Error in getIngredients:", error);
            return next(new AppError(error.message, 500));
        }
    }

    // ==========================================
    // 👁️ [GET] LẤY CHI TIẾT MỘT NGUYÊN LIỆU THEO ID
    // ==========================================
    async getIngredientDetail(req, res, next) {
        try {
            const ingredient = await ingredientService.getIngredientById(req.params.id);
            res.json({ success: true, data: ingredient });
        } catch (error) {
            console.error("🔥 Error in getIngredientDetail:", error);
            return next(new AppError(error.message, 404));
        }
    }

    // ==========================================
    // ➕ [POST] TẠO MỚI NGUYÊN LIỆU (CÓ FILE ẢNH THÔ)
    // ==========================================
    async createIngredient(req, res, next) {
        try {
            if (req.body.micronutrients && typeof req.body.micronutrients === 'string') {
                try { req.body.micronutrients = JSON.parse(req.body.micronutrients); } catch (e) { req.body.micronutrients = []; }
            }

            req.body.calories_per_unit = Number(req.body.calories_per_unit) || 0;
            req.body.protein = Number(req.body.protein) || 0;
            req.body.carbs = Number(req.body.carbs) || 0;
            req.body.fat = Number(req.body.fat) || 0;

            const { errors, isValid } = validateIngredient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, errors));

            const newIngredient = await ingredientService.createIngredient(req.body, req.file);
            const message = getActionMessage('create', 'Ingredient');
            res.status(201).json({ success: true, message, data: newIngredient });
        } catch (error) {
            console.error("🔥 Error in createIngredient:", error);
            return next(new AppError(error.message, 400));
        }
    }

    // ==========================================
    // 📝 [PUT] CẬP NHẬT NGUYÊN LIỆU (CÓ FILE ẢNH THÔ)
    // ==========================================
    async updateIngredient(req, res, next) {
        try {
            if (req.body.micronutrients && typeof req.body.micronutrients === 'string') {
                try { req.body.micronutrients = JSON.parse(req.body.micronutrients); } catch (e) { req.body.micronutrients = []; }
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

    // ==========================================
    // 🗑️ [DELETE] XÓA NGUYÊN LIỆU THEO ID
    // ==========================================
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

    // ==========================================
    // 📥 [POST] NHẬP ĐỒNG LOẠT NGUYÊN LIỆU TỪ FILE EXCEL
    // ==========================================
    async importIngredients(req, res, next) {
        try {
            if (!req.file) return next(new AppError("Please upload an Excel file", 400));
            
            // Gọi service xử lý import
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
            console.error("🔥 Error in importIngredients:", error);
            if (error.details) return next(new AppError(error.message, 400, null, error.details));
            return next(new AppError(error.message, 500));
        }
    }
}

module.exports = new IngredientManagementController();
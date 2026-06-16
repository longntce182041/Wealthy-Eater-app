// src/api/controllers/ingredient.management.controller.js
const ingredientService = require("../services/ingredient.management.service");
const { validateIngredient } = require("../validators/ingredient.management.validators");

const { cloudinary, extractCloudinaryPublicId } = require('../config/upload.config');
const AppError = require('../utils/AppError');
const getActionMessage = (action, entity) => {
    const actions = {
        create: 'created',
        update: 'updated',
        delete: 'deleted'
    };
    return `${entity} ${actions[action] || action} successfully`;
};

class IngredientManagementController {
    // GET /api/ingredients
    async getIngredients(req, res, next) {
        try {
            const result = await ingredientService.getAllIngredients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            next(new AppError(error.message, 500));
        }
    }

    // GET /api/ingredients/:id
    async getIngredientDetail(req, res, next) {
        try {
            const ingredient = await ingredientService.getIngredientById(req.params.id);
            res.json({ success: true, data: ingredient });
        } catch (error) {
            next(new AppError(error.message, 404));
        }
    }

    // POST /api/ingredients/create
    async createIngredient(req, res, next) {
        try {
            if (req.file) {
                req.body.image_url = req.file.path;
            }
            if (typeof req.body.micronutrients === 'string') {
                try {
                    req.body.micronutrients = JSON.parse(req.body.micronutrients);
                } catch (e) {
                    req.body.micronutrients = [];
                }
            }
            // Validate input
            const { errors, isValid } = validateIngredient(req.body);
            if (!isValid) {
                if (req.file) cloudinary.uploader.destroy(req.file.filename).catch(e => console.error(e));
                return next(new AppError('Validation Error: ' + JSON.stringify(errors), 400));
            }

            const newIngredient = await ingredientService.createIngredient(req.body);
            const message = getActionMessage('create', 'Ingredient');
            res.status(201).json({ success: true, message, data: newIngredient });
        } catch (error) {
            if (req.file) cloudinary.uploader.destroy(req.file.filename).catch(e => console.error(e));
            next(new AppError(error.message, 400));
        }
    }

    // PUT /api/ingredients/:id
    async updateIngredient(req, res, next) {
        try {
            if (req.file) {
                req.body.image_url = req.file.path;
            }
            if (typeof req.body.micronutrients === 'string') {
                try {
                    req.body.micronutrients = JSON.parse(req.body.micronutrients);
                } catch (e) {
                    req.body.micronutrients = [];
                }
            }
            // Fetch old ingredient to get the old ImageUrl before updating
            const oldIngredient = await ingredientService.getIngredientById(req.params.id);
            const oldImageUrl = oldIngredient ? oldIngredient.image_url : null;

            // Validate sơ bộ (nếu cần thiết có thể dùng hàm validate riêng cho update)
            const updatedIngredient = await ingredientService.updateIngredient(req.params.id, req.body);
            
            // Nếu có ảnh mới upload và bản ghi cũ có ảnh, hãy dọn dẹp ảnh cũ trên Cloudinary
            if (req.file && oldImageUrl) {
                const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
                if (oldPublicId) {
                    cloudinary.uploader.destroy(oldPublicId).catch(err => {
                        console.error('Failed to clean up old ingredient image (async):', err);
                    });
                }
            }

            const message = getActionMessage('update', 'Ingredient');
            res.json({ success: true, message, data: updatedIngredient });
        } catch (error) {
            if (req.file) cloudinary.uploader.destroy(req.file.filename).catch(e => console.error(e));
            next(new AppError(error.message, 400));
        }
    }

    // DELETE /api/ingredients/:id
    async deleteIngredient(req, res, next) {
        try {
            const oldIngredient = await ingredientService.getIngredientById(req.params.id);
            const oldImageUrl = oldIngredient ? oldIngredient.image_url : null;

            await ingredientService.deleteIngredient(req.params.id);
            
            // Xóa ảnh trên Cloudinary nếu tồn tại
            if (oldImageUrl) {
                const oldPublicId = extractCloudinaryPublicId(oldImageUrl);
                if (oldPublicId) {
                    cloudinary.uploader.destroy(oldPublicId).catch(err => {
                        console.error('Failed to clean up deleted ingredient image (async):', err);
                    });
                }
            }

            const message = getActionMessage('delete', 'Ingredient');
            res.json({ success: true, message });
        } catch (error) {
            next(new AppError(error.message, 400));
        }
    }

    // POST /api/ingredients/import
    async importIngredients(req, res, next) {
        try {
            if (!req.file) {
                return next(new AppError('Please upload an Excel file', 400));
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
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    errors: error.details
                }); // Keeping this specific custom JSON format since it's a batch report, though standard AppError doesn't easily support array of details unless we override
            }
            next(new AppError(error.message, 500));
        }
    }
}

module.exports = new IngredientManagementController();
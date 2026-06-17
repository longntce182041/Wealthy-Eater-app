const AppError = require('../utils/AppError');
const micronutrientService = require("../services/micronutrient.management.service");
const { validateCreateMicronutrient, validateUpdateMicronutrient } = require("../validators/micronutrient.management.validator");
const Micronutrient = require("../models/Micronutrient"); 

class MicronutrientManagementController {
    
    // GET List & Search/Filters Micronutrients
    async getMicronutrients(req, res, next) {
        try {
            const result = await micronutrientService.getAllMicronutrients(req.query);
            res.json({ success: true, data: result, error: null });
        } catch (error) {
            return next(new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR'));
        }
    }

    // 🎯 CREATE Micronutrient
    async createMicronutrient(req, res, next) {
        try {
            // 1. Validate dữ liệu đầu vào từ client giống như bên Ingredient
            const { errors, isValid } = validateCreateMicronutrient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors));

            const data = req.body;

            // 2. Kiểm tra trùng tên (không phân biệt hoa thường)
            const existingMicronutrient = await Micronutrient.findOne({ 
                name: { $regex: new RegExp(`^${data.name}$`, 'i') } 
            });
            
            if (existingMicronutrient) {
                return next(new AppError("Micronutrient with this name already exists", 400, 'DUPLICATE_NAME'));
            }

            // 3. Tiến hành tạo mới dữ liệu
            const micronutrient = new Micronutrient({
                name: data.name,
                unit: data.unit,
                description: data.description || "",
            });

            await micronutrient.save();
            
            // 4. Trả kết quả thành công về cho React Client
            res.status(201).json({ success: true, data: micronutrient, error: null });
        } catch (error) {
            return next(new AppError(error.message, 500, 'INTERNAL_SERVER_ERROR'));
        }
    }
    
    // UPDATE Micronutrient
    async updateMicronutrient(req, res, next) {
        try {
            const { errors, isValid } = validateUpdateMicronutrient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors));

            const updatedMicronutrient = await micronutrientService.updateMicronutrient(req.params.id, req.body);
            res.json({ success: true, data: updatedMicronutrient, error: null });
        } catch (error) {
            return next(new AppError(error.message, 400, 'UPDATE_FAILED'));
        }
    }

    // DELETE Micronutrient
    async deleteMicronutrient(req, res, next) {
        try {
            await micronutrientService.deleteMicronutrient(req.params.id);
            res.json({ success: true, data: null, error: null });
        } catch (error) {
            return next(new AppError(error.message, error.statusCode || 400, error.code, error.details));
        }
    }
}

module.exports = new MicronutrientManagementController();
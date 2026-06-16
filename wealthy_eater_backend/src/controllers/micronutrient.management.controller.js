const AppError = require('../utils/AppError');
const micronutrientService = require("../services/micronutrient.management.service");
const { validateCreateMicronutrient, validateUpdateMicronutrient } = require("../validators/micronutrient.management.validator");
const Micronutrient = require("../models/Micronutrient"); 

class MicronutrientManagementController {
    
    // GET List & Search/Filters Micronutrients
    async getMicronutrients(req, res, next) {
        try {
            const result = await micronutrientService.getAllMicronutrients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            return next(new AppError(error.message, 500));
        }
    }

    // 🎯 CREATE Micronutrient
    async createMicronutrient(req, res, next) {
        try {
            // 1. Validate dữ liệu đầu vào từ client giống như bên Ingredient
            const { errors, isValid } = validateCreateMicronutrient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, errors));

            const data = req.body;

            // 2. Kiểm tra trùng tên (không phân biệt hoa thường)
            const existingMicronutrient = await Micronutrient.findOne({ 
                name: { $regex: new RegExp(`^${data.name}$`, 'i') } 
            });
            
            if (existingMicronutrient) {
                return next(new AppError("Micronutrient with this name already exists", 400));
            }

            // 3. Tiến hành tạo mới dữ liệu
            const micronutrient = new Micronutrient({
                name: data.name,
                unit: data.unit,
                description: data.description || "",
            });

            await micronutrient.save();
            
            // 4. Trả kết quả thành công về cho React Client
            res.status(201).json({ success: true, message: "Micronutrient created successfully", data: micronutrient });
        } catch (error) {
            return next(new AppError(error.message, 500));
        }
    }
    
    // UPDATE Micronutrient
    async updateMicronutrient(req, res, next) {
        try {
            const { errors, isValid } = validateUpdateMicronutrient(req.body);
            if (!isValid) return next(new AppError('Validation Error', 400, null, errors));

            const updatedMicronutrient = await micronutrientService.updateMicronutrient(req.params.id, req.body);
            res.json({ success: true, message: "Micronutrient updated successfully", data: updatedMicronutrient });
        } catch (error) {
            return next(new AppError(error.message, 400));
        }
    }

    // DELETE Micronutrient
    async deleteMicronutrient(req, res, next) {
        try {
            await micronutrientService.deleteMicronutrient(req.params.id);
            res.json({ success: true, message: "Micronutrient deleted successfully" });
        } catch (error) {
            return next(new AppError(error.message, error.statusCode || 400, error.code, error.details));
        }
    }
}

module.exports = new MicronutrientManagementController();
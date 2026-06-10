const micronutrientService = require("../services/micronutrient.management.service");
const { validateCreateMicronutrient, validateUpdateMicronutrient } = require("../validators/micronutrient.management.validator");
const Micronutrient = require("../models/Micronutrient"); 

class MicronutrientManagementController {
    
    // GET List & Search/Filters Micronutrients
    async getMicronutrients(req, res) {
        try {
            const result = await micronutrientService.getAllMicronutrients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // 🎯 CREATE Micronutrient - Đã cấu trúc lại nhận (req, res) chuẩn Express Router
    async createMicronutrient(req, res) {
        try {
            // 1. Validate dữ liệu đầu vào từ client giống như bên Ingredient
            const { errors, isValid } = validateCreateMicronutrient(req.body);
            if (!isValid) return res.status(400).json({ success: false, errors });

            const data = req.body;

            // 2. Kiểm tra trùng tên (không phân biệt hoa thường)
            const existingMicronutrient = await Micronutrient.findOne({ 
                name: { $regex: new RegExp(`^${data.name}$`, 'i') } 
            });
            
            if (existingMicronutrient) {
                return res.status(400).json({ success: false, message: "Micronutrient with this name already exists" });
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
            res.status(500).json({ success: false, message: error.message });
        }
    }
    
    // UPDATE Micronutrient
    async updateMicronutrient(req, res) {
        try {
            const { errors, isValid } = validateUpdateMicronutrient(req.body);
            if (!isValid) return res.status(400).json({ success: false, errors });

            const updatedMicronutrient = await micronutrientService.updateMicronutrient(req.params.id, req.body);
            res.json({ success: true, message: "Micronutrient updated successfully", data: updatedMicronutrient });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // DELETE Micronutrient
    async deleteMicronutrient(req, res) {
        try {
            await micronutrientService.deleteMicronutrient(req.params.id);
            res.json({ success: true, message: "Micronutrient deleted successfully" });
        } catch (error) {
            res.status(error.statusCode || 400).json({
                success: false,
                code: error.code,
                message: error.message,
                details: error.details,
            });
        }
    }
}

module.exports = new MicronutrientManagementController();
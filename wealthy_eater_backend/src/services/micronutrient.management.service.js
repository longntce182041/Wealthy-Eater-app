const { validateMicronutrient } = require("../validators/micronutrient.management.validator");
const Micronutrient = require("../models/Micronutrient");
const XLSX = require("xlsx");

class MicronutrientManagementService {
    
    // GET All Micronutrients with Search & Pagination
    async getAllMicronutrients(query) {
        const { keyword, unit, createdFrom, createdTo, page = 1, limit = 10 } = query;
        const filter = {};

        // Search by name
        if (keyword) {
            filter.name = { $regex: keyword, $options: "i" };
        }

        // Filter by unit
        if (unit) {
            filter.unit = unit;
        }

        // Filter by created date range
        if (createdFrom || createdTo) {
            filter.createdAt = {};
            if (createdFrom) {
                const from = new Date(createdFrom);
                if (!isNaN(from)) filter.createdAt.$gte = from;
            }
            if (createdTo) {
                const to = new Date(createdTo);
                if (!isNaN(to)) filter.createdAt.$lte = to;
            }
            if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
        }

        const skip = (page - 1) * limit;

        const micronutrients = await Micronutrient.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Micronutrient.countDocuments(filter);

        return {
            micronutrients,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // UPDATE Micronutrient
    async updateMicronutrient(id, data) {
        const micronutrient = await Micronutrient.findById(id);
        if (!micronutrient) {
            throw new Error("Micronutrient not found");
        }

        // Check if new name conflicts with existing micronutrient
        if (data.name && data.name !== micronutrient.name) {
            const existingMicronutrient = await Micronutrient.findOne({ 
                name: { $regex: new RegExp(`^${data.name}$`, 'i') },
                _id: { $ne: id }
            });
            
            if (existingMicronutrient) {
                throw new Error("Micronutrient with this name already exists");
            }
        }

        if (data.name) micronutrient.name = data.name;
        if (data.unit) micronutrient.unit = data.unit;
        if (data.description !== undefined) micronutrient.description = data.description;

        await micronutrient.save();
        return micronutrient;
    }

    // DELETE Micronutrient
    async deleteMicronutrient(id) {
        const micronutrient = await Micronutrient.findById(id);
        if (!micronutrient) {
            throw new Error("Micronutrient not found");
        }

        // Giữ nguyên logic check ràng buộc dữ liệu khi xóa của bạn
        let totalUsageCount = 0;
        try {
            const [ingredientUsageCount, recipeUsageCount] = await Promise.all([
                global.IngredientMicronutrientValues ? global.IngredientMicronutrientValues.countDocuments({ micronutrientId: id }) : Promise.resolve(0),
                global.RecipeMicronutrientValues ? global.RecipeMicronutrientValues.countDocuments({ micronutrientId: id }) : Promise.resolve(0),
            ]);
            totalUsageCount = ingredientUsageCount + recipeUsageCount;
            
            if (totalUsageCount > 0) {
                const error = new Error(`Cannot delete micronutrient because it is in use.`);
                error.statusCode = 409;
                throw error;
            }
        } catch(e) {
            if (e.statusCode === 409) throw e;
        }
        
        await Micronutrient.findByIdAndDelete(id);
        return { message: "Micronutrient deleted successfully" };
    }
}

module.exports = new MicronutrientManagementService();
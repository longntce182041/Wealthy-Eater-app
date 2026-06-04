const  Micronutrient  = require("../models/Micronutrient");
const XLSX = require("xlsx");
const { validateMicronutrient } = require("../validators/micronutrient.management.validator");

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
    
    // CREATE Micronutrient
    async createMicronutrient(req, res) {
        try {
            const { errors, isValid } = validateCreateMicronutrient(req.body);
            if (!isValid) return res.status(400).json({ success: false, errors });

            const newMicronutrient = await micronutrientService.createMicronutrient(req.body);
            res.status(201).json({ success: true, message: "Micronutrient created successfully", data: newMicronutrient });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }


    
}

module.exports = new MicronutrientManagementService();

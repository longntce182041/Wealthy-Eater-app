const micronutrientService = require("../services/micronutrient.management.service");
const { validateCreateMicronutrient, validateUpdateMicronutrient } = require("../validators/micronutrient.management.validator");

class MicronutrientManagementController {
    
    async getMicronutrients(req, res) {
        try {
            const result = await micronutrientService.getAllMicronutrients(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // CREATE Micronutrient
    async createMicronutrient(data) {
        // Check if micronutrient with same name already exists
        const existingMicronutrient = await Micronutrient.findOne({ 
            name: { $regex: new RegExp(`^${data.name}$`, 'i') } 
        });
        
        if (existingMicronutrient) {
            throw new Error("Micronutrient with this name already exists");
        }

        const micronutrient = new Micronutrient({
            name: data.name,
            unit: data.unit,
            description: data.description || "",
        });

        await micronutrient.save();
        return micronutrient;
    }
    

}

module.exports = new MicronutrientManagementController();

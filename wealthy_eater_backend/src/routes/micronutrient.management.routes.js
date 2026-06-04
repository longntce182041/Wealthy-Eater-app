const express = require("express");
const router = express.Router();
const micronutrientController = require("../controllers/micronutrient.management.controller");
const { protect, authorize } = require("../middlewares/authMiddleware");


// GET List & Search Micronutrients 
router.get("/", protect, authorize("admin"), micronutrientController.getMicronutrients);

// POST Create Micronutrient 
router.post("/create", protect, authorize("admin"), micronutrientController.createMicronutrient);

// PUT Update Micronutrient 
router.put("/update/:id", protect, authorize("admin"), micronutrientController.updateMicronutrient);

// DELETE Micronutrient (Protected )
router.delete("/delete/:id", protect, authorize("admin"), micronutrientController.deleteMicronutrient);



module.exports = router;
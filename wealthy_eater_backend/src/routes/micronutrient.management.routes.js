const express = require("express");
const router = express.Router();
const micronutrientController = require("../controllers/micronutrient.management.controller");
const { protect, authorize } = require("../middlewares/authMiddleware");


// GET List & Search Micronutrients 
router.get("/", protect, authorize("admin"), micronutrientController.getMicronutrients);

// POST Create Micronutrient 
router.post("/create", protect, authorize("admin"), micronutrientController.createMicronutrient);





module.exports = router;
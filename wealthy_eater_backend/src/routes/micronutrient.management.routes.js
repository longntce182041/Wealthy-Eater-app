const express = require("express");
const router = express.Router();
const micronutrientController = require("../controllers/micronutrient.management.controller");
const { protect, authorize } = require("../middlewares/authMiddleware");


// GET List & Search Micronutrients (Public)
router.get("/", micronutrientController.getMicronutrients);







module.exports = router;
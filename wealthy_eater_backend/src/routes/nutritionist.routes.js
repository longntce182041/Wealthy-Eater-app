const express = require("express");
const router = express.Router();
const nutritionistController = require("../controllers/nutritionist.controller");
const { protect } = require("../middlewares/authMiddleware");
const {
  uploadNutritionistCertificate,
} = require("../middlewares/upload.middleware");

// GET /api/nutritionists - Get list of approved nutritionists
router.get("/", nutritionistController.getNutritionists);

// BE- UC-45 step 1
// POST /api/nutritionists/register-account - Create user account first
router.post(
  "/register-account",
  nutritionistController.createNutritionistUserAccount,
);

// BE- UC-45 register expert account
// Requires authenticated customer account from step 1
// POST /api/nutritionists/register - Submit nutritionist registration request
router.post(
  "/register",
  protect,
  uploadNutritionistCertificate,
  nutritionistController.registerNutritionist,
);

module.exports = router;

const express = require('express');
const router = express.Router();
const nutritionistController = require('../controllers/nutritionist.controller');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { uploadNutritionistCertificate } = require('../middlewares/upload.middleware');

// GET /api/nutritionists — Public endpoint to list all approved nutritionists for hire
router.get('/', nutritionistController.getNutritionists);

// GET /api/nutritionists/meal-plan-requests — Nutritionist: view pending meal plan requests (UC-13)
router.get(
  '/meal-plan-requests',
  authenticateToken,
  authorizeRoles('nutritionist'),
  nutritionistController.getMealPlanRequests,
);

// POST /api/nutritionists/meal-plan-requests/:id/respond — Nutritionist: approve/reject request (UC-13)
router.post(
  '/meal-plan-requests/:id/respond',
  authenticateToken,
  authorizeRoles('nutritionist'),
  nutritionistController.respondToMealPlanRequest,
);

// BE-UC-45 step 1
// POST /api/nutritionists/register-account — Public self-registration endpoint for nutritionist applicants.
// This creates the base User account (role=nutritionist) before the professional profile is submitted.
router.post(
  '/register-account',
  nutritionistController.createNutritionistUserAccount,
);

// BE-UC-45 register expert profile
// POST /api/nutritionists/register — Authenticated nutritionist submits their professional profile
router.post(
  '/register',
  authenticateToken,
  authorizeRoles('nutritionist'),
  uploadNutritionistCertificate,
  nutritionistController.registerNutritionist,
);

// GET /api/nutritionists/profile/me — Authenticated nutritionist views their professional profile
router.get(
  '/profile/me',
  authenticateToken,
  authorizeRoles('nutritionist'),
  nutritionistController.getNutritionistProfile,
);

// PUT /api/nutritionists/profile/me — Authenticated nutritionist updates their professional profile
router.put(
  '/profile/me',
  authenticateToken,
  authorizeRoles('nutritionist'),
  uploadNutritionistCertificate,
  nutritionistController.updateNutritionistProfile,
);

module.exports = router;

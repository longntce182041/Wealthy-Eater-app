const express = require('express');
const router = express.Router();
const pantryController = require('../controllers/pantry.controller');
const { authenticateToken } = require('../middlewares/auth');
const { uploadMealImage } = require('../middlewares/imageUpload.middleware');

// All routes require authentication
router.use(authenticateToken);

// GET /api/pantry - Retrieve current pantry ingredients
router.get('/', pantryController.getPantry);

// POST /api/pantry/manual - Update pantry manually (overwrites list)
router.post('/manual', pantryController.updatePantry);

// POST /api/pantry/scan - Scan pantry image (receives single file field 'image')
router.post('/scan', uploadMealImage, pantryController.scanPantry);

module.exports = router;

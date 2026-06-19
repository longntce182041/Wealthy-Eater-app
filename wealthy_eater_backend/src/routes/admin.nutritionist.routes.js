const express = require('express');
const router = express.Router();

// 🌟 SỬA ĐƯỜNG DẪN: Thêm 'admin.' vào trước tên file để tìm đúng file chứa hàm getNutritionistsList
const { getNutritionistsList } = require('../controllers/admin.nutritionist.controller');
const nutritionistController = require('../controllers/admin.nutritionist.controller');

/**
 * UC-83: View Nutritionist Directory
 * GET /api/admin/nutritionists
 */
// Gọi trực tiếp hàm đã bóc tách, không sợ bị lệch object nữa
router.get('/', getNutritionistsList); 
router.put('/:id/verify', nutritionistController.verifyNutritionistCertificate);

module.exports = router;
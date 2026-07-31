const express = require("express");
const router = express.Router();
const multer = require("multer");
const ingredientController = require("../controllers/ingredient.management.controller");
const { protect, authorize } = require("../middlewares/authMiddleware");
const { uploadIngredientImage } = require("../middlewares/imageUpload.middleware");

// Cấu hình riêng cho Excel
const storage = multer.memoryStorage();
const uploadExcel = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel';
        if (mimetype) return cb(null, true);
        cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
});

router.get("/", protect, authorize('admin'), ingredientController.getIngredients);
router.get('/select-list', ingredientController.getAllIngredientsDropdown);
router.get("/:id", protect, authorize('admin'), ingredientController.getIngredientDetail);
router.delete("/delete/:id", protect, authorize('admin'), ingredientController.deleteIngredient);
router.post("/import", protect, authorize('admin'), uploadExcel.single("file"), ingredientController.importIngredients);
router.post("/create", protect, authorize('admin'), uploadIngredientImage, ingredientController.createIngredient);
router.put("/update/:id", protect, authorize('admin'), uploadIngredientImage, ingredientController.updateIngredient);

module.exports = router;
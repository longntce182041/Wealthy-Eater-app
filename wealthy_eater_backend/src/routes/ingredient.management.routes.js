const express = require("express");
const router = express.Router();
const multer = require("multer");
const ingredientController = require("../controllers/ingredient.management.controller");
const { protect, authorize } = require("../middlewares/authMiddleware");

// Cấu hình multer lưu trữ tạm thời trong bộ nhớ (Memory Storage) để xử lý stream
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        // Chỉ chấp nhận các file Excel có định dạng xlsx hoặc xls
        const filetypes = /xlsx|xls/;
        const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel';
        if (mimetype) {
            return cb(null, true);
        }
        cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
});

// UC-60 View List Ingredients
router.get("/", protect, authorize('admin'), ingredientController.getIngredients);
// UC-62 Create Ingredient
router.post("/create", protect, authorize('admin'), ingredientController.createIngredient);
// UC-61 View Ingredient Detail
router.get("/:id", protect, authorize('admin'), ingredientController.getIngredientDetail);
// UC-63 Update Ingredient
router.put("/update/:id", protect, authorize('admin'), ingredientController.updateIngredient);
// UC-63 Delete Ingredient
router.delete("/delete/:id", protect, authorize('admin'), ingredientController.deleteIngredient);

//UC-65 API Import Ingredients từ Excel bằng Stream Pipeline & bulkWrite
router.post(
    "/import", 
    protect, 
    authorize('admin'), 
    upload.single("file"), // Tên key của file gửi từ Client/Postman phải là "file"
    ingredientController.importIngredients
);

module.exports = router;
const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!file || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, and PNG image files are allowed"), false);
    }
    cb(null, true);
  },
});

function uploadIngredientImage(req, res, next) {
  upload.single("imageFile")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image file must be 5MB or smaller",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Invalid image file",
    });
  });
}

module.exports = {
  uploadIngredientImage,
};
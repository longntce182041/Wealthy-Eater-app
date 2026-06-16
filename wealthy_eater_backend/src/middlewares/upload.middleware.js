const multer = require("multer");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
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
      return cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
    }
    cb(null, true);
  },
});

function uploadNutritionistCertificate(req, res, next) {
  upload.single("certificateFile")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Certificate file must be 10MB or smaller",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Invalid certificate file",
    });
  });
}

module.exports = {
  uploadNutritionistCertificate,
};

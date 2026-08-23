/**
 * cloudinary.config.js — Multer configuration for image uploads using Cloudinary.
 */

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { Readable } = require('stream');
const AppError = require('../utils/AppError');

// ── Cloudinary Configuration ──────────────────────────────────────────────────
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// ── Allowed MIME-Type validation ──────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`, 400, 'UNSUPPORTED_FILE_TYPE'),
      false
    );
  }
}

// ── Storage Engines ──────────────────────────────────────────────────────────

const createCloudinaryStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `WealthyEater/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ fetch_format: 'auto' }, { quality: 'auto' }],
      public_id: (req, file) => `${folderName}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    },
  });
};

const chatStorage = createCloudinaryStorage('chat');
const avatarStorage = createCloudinaryStorage('avatars');
// 🟢 1. Khai báo Storage cho Recipes
const recipeStorage = createCloudinaryStorage('recipes'); 

// ── Export Configured Multer Instances ────────────────────────────────────────

const chatUpload = multer({
  storage: chatStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// 🟢 2. KHAI BÁO BIẾN recipeUpload Ở ĐÂY
const recipeUpload = multer({
  storage: recipeStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Cấu hình bổ sung phục vụ Recipe & Excel ───────────────────────────────

const uploadBase64ToCloudinary = async (base64Str) => {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  
  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Str, {
      folder: 'WealthyEater/recipes',
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary Upload Base64 Error:', error);
    throw new AppError('Không thể tải hình ảnh công thức lên Cloudinary.', 502);
  }
};

const uploadExcel = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];

    if (path.match(/^v\d+\//)) {
      path = path.replace(/^v\d+\//, '');
    }

    if (path.includes('/')) {
      const firstSegment = path.substring(0, path.indexOf('/'));
      if (firstSegment.includes(',')) {
        path = path.substring(path.indexOf('/') + 1);
        if (path.match(/^v\d+\//)) {
          path = path.replace(/^v\d+\//, '');
        }
      }
    }

    const dotIndex = path.lastIndexOf('.');
    if (dotIndex !== -1) {
      path = path.substring(0, dotIndex);
    }
    return path;
  } catch (error) {
    console.error('Error extracting Cloudinary public_id:', error);
    return null;
  }
};

function uploadNutritionistCertificate(file, certificateUrl) {
  // 1. If a file was uploaded, always process and upload to Cloudinary
  if (file?.buffer) {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError("Cloudinary configuration is missing", 500);
    }

    const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "WealthyEater/nutritionists/certificates",
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary certificate upload error:", error);
            return reject(new AppError("Failed to upload certificate file", 502));
          }

          return resolve({
            url: result.secure_url,
            publicId: result.public_id,
            uploadMethod: "file",
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  // 2. If no file, use provided certificateUrl
  if (certificateUrl) {
    if (typeof certificateUrl !== "string" || !certificateUrl.trim()) {
      throw new AppError("Invalid certificate URL", 400);
    }
    return Promise.resolve({
      url: certificateUrl.trim(),
      publicId: extractCloudinaryPublicId(certificateUrl),
      uploadMethod: "url",
    });
  }

  throw new AppError("Certificate file or URL is required", 400);
}

// 🟢 3. EXPORT CÁC BIẾN ĐÃ ĐƯỢC KHAI BÁO
module.exports = {
  cloudinary,
  chatUpload,
  avatarUpload,
  recipeUpload,               // Đã có khai báo ở trên!
  uploadImage: recipeUpload,  // Alias hỗ trợ route
  uploadExcel,
  uploadBase64ToCloudinary,
  extractCloudinaryPublicId,
  uploadNutritionistCertificate
};
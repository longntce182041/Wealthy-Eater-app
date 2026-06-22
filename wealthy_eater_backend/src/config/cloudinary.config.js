/**
 * cloudinary.config.js — Multer configuration for image uploads using Cloudinary.
 *
 * Configures Cloudinary storage engines for different upload contexts.
 * Currently supports 'chat' uploads stored in the 'WealthyEater/chat' folder.
 *
 * Constraints:
 * - Max file size: 10 MB
 * - Allowed formats: JPEG, PNG, WebP, GIF
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

// ── Storage Engines (DRY Principle Applied) ──────────────────────────────────

/**
 * Tạo cấu hình CloudinaryStorage chung giúp dễ dàng mở rộng và tối ưu hóa
 * @param {string} folderName - Tên thư mục con bên trong 'WealthyEater/'
 * @returns {CloudinaryStorage}
 */
const createCloudinaryStorage = (folderName) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `WealthyEater/${folderName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      // Tự động chuyển đổi sang webp/avif tùy thiết bị và nén tự động để tối ưu hiệu năng (Performance Optimization)
      transformation: [{ fetch_format: 'auto' }, { quality: 'auto' }],
      public_id: (req, file) => `${folderName}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    },
  });
};

const chatStorage = createCloudinaryStorage('chat');
const avatarStorage = createCloudinaryStorage('avatars');

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

// 🆕 ── Cấu hình bổ sung phục vụ Recipe & Excel ───────────────────────────────

/**
 * Helper hỗ trợ upload một chuỗi ảnh Base64 từ Frontend lên Cloudinary nhằm giải quyết lỗi 413 Payload Too Large
 * @param {String} base64Str Chuỗi ảnh base64 từ frontend gửi lên
 * @returns {Promise<String>} Trả về đường dẫn URL của ảnh sau khi upload thành công
 */
const uploadBase64ToCloudinary = async (base64Str) => {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  
  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Str, {
      folder: 'WealthyEater/recipes', // Đưa vào cụm thư mục gốc chung WealthyEater
      resource_type: 'image'
    });
    return uploadResponse.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary Upload Base64 Error:', error);
    throw new AppError('Không thể tải hình ảnh công thức lên Cloudinary.', 502);
  }
};

// Cấu hình lưu tạm file Excel vào RAM để làm sạch payload trung gian
const uploadExcel = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn file excel 10MB
});

/**
 * Trích xuất public_id từ URL Cloudinary để dọn dẹp file cũ (tránh leak storage)
 * @param {string} url - URL của ảnh trên Cloudinary
 * @returns {string|null}
 */
const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];

    // Loại bỏ version (ex: v1234567890/)
    if (path.match(/^v\d+\//)) {
      path = path.replace(/^v\d+\//, '');
    }

    // Loại bỏ transformation (ex: f_auto,q_auto/)
    if (path.includes('/')) {
      const firstSegment = path.substring(0, path.indexOf('/'));
      if (firstSegment.includes(',')) { // Khả năng cao là transformation
        path = path.substring(path.indexOf('/') + 1);
        // Loại bỏ version nếu version đứng sau transformation
        if (path.match(/^v\d+\//)) {
          path = path.replace(/^v\d+\//, '');
        }
      }
    }

    // Loại bỏ extension
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

/**
 * Tải lên chứng chỉ chuyên gia dinh dưỡng (hỗ trợ buffer stream)
 * @param {Express.Multer.File} file 
 * @param {string} certificateUrl 
 */
function uploadNutritionistCertificate(file, certificateUrl) {
  if (certificateUrl) {
    if (typeof certificateUrl !== "string" || !certificateUrl.trim()) {
      throw new AppError("Invalid certificate URL", 400);
    }
    return Promise.resolve({
      url: certificateUrl,
      publicId: null,
      uploadMethod: "url",
    });
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError("Cloudinary configuration is missing", 500);
  }

  if (!file?.buffer) {
    throw new AppError("Certificate file or URL is required", 400);
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

// 🔥 Cập nhật xuất bản đầy đủ hàm ra bên ngoài
module.exports = {
  cloudinary,
  chatUpload,
  avatarUpload,
  uploadExcel,               // 🆕 Xuất bản cho route Excel nhận diện
  uploadBase64ToCloudinary,  // 🆕 Xuất bản cho controller xử lý chuỗi ảnh
  extractCloudinaryPublicId,
  uploadNutritionistCertificate
};
/**
 * upload.config.js — Multer configuration for image uploads using Cloudinary.
 *
 * Configures Cloudinary storage engines for different upload contexts.
 * Currently supports 'chat' uploads stored in the 'WealthyEater/chat' folder.
 *
 * Constraints:
 *  - Max file size: 10 MB
 *  - Allowed formats: JPEG, PNG, WebP, GIF
 */

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const AppError = require('../utils/AppError');

// ── Cloudinary Configuration ──────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

module.exports = { 
  cloudinary, 
  chatUpload,
  avatarUpload,
  extractCloudinaryPublicId
};

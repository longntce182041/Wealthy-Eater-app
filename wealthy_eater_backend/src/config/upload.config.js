/**
 * upload.config.js — Multer configuration for chat image uploads.
 *
 * Stores uploaded files on disk under `uploads/chat/`.
 * The directory is created automatically if it does not exist.
 *
 * Constraints:
 *  - Max file size: 10 MB
 *  - Allowed MIME types: JPEG, PNG, WebP, GIF
 *  - Unique filenames generated via timestamp + random suffix to prevent collisions.
 */

const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// ── Upload Directory ──────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'chat');

// Ensure the upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Storage Engine ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // Derive extension strictly from mimetype to prevent stored XSS (e.g. uploading .html spoofed as image/png)
    const extMap = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    const ext       = extMap[file.mimetype] || '.bin';
    const timestamp = Date.now();
    const random    = Math.floor(Math.random() * 1_000_000);
    cb(null, `chat_${timestamp}_${random}${ext}`);
  },
});

// ── MIME-Type Whitelist ───────────────────────────────────────────────────────
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
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`), false);
  }
}

// ── Export Configured Multer Instance ────────────────────────────────────────
const chatUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

module.exports = { chatUpload, UPLOAD_DIR };

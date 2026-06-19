const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

let firebaseMessaging = null;

try {
  // Đường dẫn trỏ vào file mật khóa ngang hàng với package.json
  const serviceAccountPath = path.join(process.cwd(), 'firebase-key.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    
    // Khởi tạo theo chuẩn modular của Firebase Admin v10/v11/v12 trở lên
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    firebaseMessaging = getMessaging(app);
    console.log('[Firebase] Khởi tạo Firebase Admin SDK thành công với file firebase-key.json thật!');
  } else {
    console.warn('[Firebase Sandbox] Không tìm thấy file firebase-key.json ở thư mục gốc. Bật chế độ giả lập.');
  }
} catch (err) {
  console.error('[Firebase Init Error] Thất bại khi khởi tạo cấu hình:', err.message);
}

module.exports = {
  admin,
  messaging: firebaseMessaging
};
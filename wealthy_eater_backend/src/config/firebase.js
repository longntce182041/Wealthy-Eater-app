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

const clientConfig = {
  apiKey: "AIzaSyD2_O0KaJRWhygiF_Op15E3-vm0kQTQR4E",
  authDomain: "wealth-eater-app.firebaseapp.com",
  projectId: "wealth-eater-app",
  storageBucket: "wealth-eater-app.firebasestorage.app",
  messagingSenderId: "966206276554",
  appId: "1:966206276554:web:035f2ed2058e0d4343c533",
  measurementId: "G-QQS9JR8GV1"
};

module.exports = {
  admin,
  messaging: firebaseMessaging,
  clientConfig
};
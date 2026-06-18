import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // 🔥 THÊM CẤU HÌNH NÀY: Cho phép truyền dữ liệu dung lượng lớn qua proxy của Vite không giới hạn
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Đảm bảo không bị nghẽn dữ liệu chữ (chuỗi Base64) khi forward sang backend
            if (req.body && Object.keys(req.body).length) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
        },
      },
    },
  },
})
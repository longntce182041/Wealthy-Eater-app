import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Thêm dòng này
import { AppRoutes } from './routes/AppRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      
      {/* Cấu hình Toaster:
        - position: Hiển thị góc trên cùng bên phải màn hình
        - duration: 5000ms (Đúng 5 giây tự ẩn)
      */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 5000,
          style: {
            background: 'var(--card-bg)', // Đồng bộ nền sáng
            color: 'var(--text-h)',
            border: '1px solid var(--border)'
          }
        }} 
      />
    </BrowserRouter>
  );
}
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Thêm dòng này
import './App.css';
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
            background: '#1e293b', // Màu nền tối đồng bộ với admin dashboard của bạn
            color: '#fff',
            border: '1px solid #334155'
          }
        }} 
      />
    </BrowserRouter>
  );
}
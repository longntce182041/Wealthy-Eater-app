import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import { AppRoutes } from './routes/AppRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      
      {/* Cấu hình Toaster hệ thống */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 5000,
          style: {
            padding: '16px 24px',  // Kích thước to béo
            fontSize: '16px',      // Chữ to rõ ràng
            fontWeight: '500',
            borderRadius: '12px',
            minWidth: '360px',     // Độ rộng bề thế
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
          }
        }} 
      />
    </BrowserRouter>
  );
}
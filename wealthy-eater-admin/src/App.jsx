import { BrowserRouter } from 'react-router-dom';
import './App.css';
import { AppRoutes } from './routes/AppRoute'; // Đổi tên cho đúng với component exported bên trong file

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
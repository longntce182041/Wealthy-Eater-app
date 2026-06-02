import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function RequireAdmin({ children }) {
  const token = localStorage.getItem('admin_session_jwt_token');
  const userRaw = localStorage.getItem('admin_user');
  if (!token || !userRaw) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(userRaw);
    if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

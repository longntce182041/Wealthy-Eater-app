import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function RequireNutritionist({ children }) {
  const token = localStorage.getItem('nutritionist_session_jwt_token');
  const userRaw = localStorage.getItem('nutritionist_user');
  if (!token || !userRaw) return <Navigate to="/login" replace />;
  try {
    const user = JSON.parse(userRaw);
    if (!user || user.role !== 'nutritionist') return <Navigate to="/login" replace />;
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
            <RequireNutritionist>
              <Dashboard />
            </RequireNutritionist>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

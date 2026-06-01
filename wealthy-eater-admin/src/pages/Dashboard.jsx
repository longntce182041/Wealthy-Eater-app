import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('admin_user');
    if (!raw) {
      navigate('/login');
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch (e) {
      localStorage.removeItem('admin_user');
      navigate('/login');
    }
  }, []);

  function logout() {
    localStorage.removeItem('admin_session_jwt_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  }

  if (!user) return null;

  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome, {user.fullName || user.email}</h2>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Sign out</button>
    </div>
  );
}

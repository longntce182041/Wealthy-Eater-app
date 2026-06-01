import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('nutritionist_user');
    const token = localStorage.getItem('nutritionist_session_jwt_token');
    if (!raw || !token) {
      navigate('/login');
      return;
    }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      // initialize socket with token
      socketService.initializeConnection(token);
    } catch (e) {
      localStorage.removeItem('nutritionist_user');
      navigate('/login');
    }

    return () => {
      socketService.disconnectWorkspace();
    };
  }, []);

  function logout() {
    localStorage.removeItem('nutritionist_session_jwt_token');
    localStorage.removeItem('nutritionist_user');
    socketService.disconnectWorkspace();
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

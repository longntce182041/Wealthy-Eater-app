import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const resp = await apiClient.post('/auth/login', { email, password });
      const payload = resp.data && resp.data.data;
      if (!payload) throw new Error('Invalid response from server');

      const { accessToken, user } = payload;
      if (!accessToken) throw new Error('Missing access token');

      // Only allow admin role here
      if (!user || user.role !== 'admin') {
        setError('Access denied: account is not an admin');
        return;
      }

      localStorage.setItem('admin_session_jwt_token', accessToken);
      localStorage.setItem('admin_user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setError(msg);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Admin Sign In</h2>
        {error && <div className="error">{error}</div>}
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}

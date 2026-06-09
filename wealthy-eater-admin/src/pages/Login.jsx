import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await apiClient.post('/auth/login', { email, password, role: 'admin' });
      const payload = resp.data && resp.data.data;
      if (!payload) throw new Error('Invalid response from server');

      const { accessToken, user } = payload;
      if (!accessToken) throw new Error('Missing access token');

      // Only allow admin role here
      if (!user || user.role !== 'admin') {
        setError('Access denied: account is not an admin');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_session_jwt_token', accessToken);
      localStorage.setItem('admin_user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <div className="logo-icon">
            {/* Beautiful Crown / Shield Icon for Admin */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2>Admin Portal</h2>
          <p>Sign in to manage Wealthy Eater</p>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label>Email Address</label>
          <div className="input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@wealthyeater.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? (
            <span>Signing in...</span>
          ) : (
            <>
              <span>Sign In</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

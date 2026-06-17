import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';

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

      const { accessToken, refreshToken, user } = payload;
      if (!accessToken) throw new Error('Missing access token');

      // Only allow admin role here
      if (!user || user.role !== 'admin') {
        setError('Access denied: account is not an admin');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_session_jwt_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('admin_refresh_token', refreshToken);
      }
      localStorage.setItem('admin_user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full m-0 p-0 overflow-hidden bg-background">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary-hover relative items-center justify-center overflow-hidden text-white p-10">
        {/* Glowing orb animation equivalent */}
        <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,transparent_60%)] animate-[pulse_10s_infinite_alternate_ease-in-out]"></div>
        
        <div className="relative z-10 text-center max-w-[400px]">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] text-white">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight text-white">Wealthy Eater</h1>
          <p className="text-xl opacity-90 font-normal text-white/85">HealthTech Platform Administration</p>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-10">
        <form className="w-full max-w-[440px] bg-card p-10 lg:p-12 rounded-3xl shadow-xl border border-border transition-transform duration-300" onSubmit={handleSubmit}>
          <div className="mb-10">
            <h2 className="text-[32px] text-foreground font-extrabold m-0 tracking-tight">Admin Portal</h2>
            <p className="text-muted-foreground mt-2 text-base">Sign in to manage the platform</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 mb-6 text-sm font-medium border border-destructive/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-main mb-2.5">Email Address</label>
            <div className="relative group">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input
                className="w-full py-3.5 pr-4 pl-12 border-[1.5px] border-border rounded-xl text-base text-foreground bg-muted transition-all outline-none box-border focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="admin@wealthyeater.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-main mb-2.5">Password</label>
            <div className="relative group">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input
                className="w-full py-3.5 pr-4 pl-12 border-[1.5px] border-border rounded-xl text-base text-foreground bg-muted transition-all outline-none box-border focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full p-4 bg-primary text-white border-none rounded-xl text-base font-semibold cursor-pointer flex items-center justify-center gap-3 mt-8 transition-all shadow-[0_4px_12px_rgba(74,159,113,0.2)] hover:not-disabled:bg-primary-hover hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_16px_rgba(74,159,113,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
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
    </div>
  );
}

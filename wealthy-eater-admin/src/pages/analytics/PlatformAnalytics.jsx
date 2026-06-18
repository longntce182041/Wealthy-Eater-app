import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';
import './platformAnalytics.css';
import ExpertPerformanceSection from '../../components/ExpertPerformanceSection';

export default function PlatformAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [startDate, setStartDate] = useState(() => 
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [analyticsData, setAnalyticsData] = useState({
    newCustomers: [],
    dailyActiveUsers: [],
    healthGoalAchievement: []
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/analytics/customer-growth', {
        params: { startDate, endDate }
      });

      if (res.data?.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics customer growth data:', err);
      
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_session_jwt_token');
        navigate('/login');
        return;
      }
      
      setError(err?.response?.data?.message || err.message || 'Failed to load platform analytics data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, navigate]);

  useEffect(() => {
    const rawUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_session_jwt_token');

    if (!rawUser || !token) {
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin_session_jwt_token');
      navigate('/login');
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchAnalytics();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchAnalytics, navigate]);

  const mergedData = (analyticsData.newCustomers || []).map((item) => {
    const dauItem = (analyticsData.dailyActiveUsers || []).find((d) => d._id === item._id);
    const healthItem = (analyticsData.healthGoalAchievement || []).find((h) => h._id === item._id);
    return {
      date: item._id,
      'New Customers': item.count,
      'Daily Active Users (DAU)': dauItem ? dauItem.dau : 0,
      'Health Goal Rate (%)': healthItem ? parseFloat(healthItem.achievementRate.toFixed(1)) : 0
    };
  });

  return (
    <div className="analytics-container">
      {/* Bộ lọc thời gian trên Dashboard */}
      <div className="analytics-header">
        <h2>Platform Analytics Overview</h2>
        <div className="filter-group">
          <div className="date-input">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="date-input">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="btn-refresh" onClick={fetchAnalytics}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span style={{ verticalAlign: 'middle' }}>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '30px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="analytics-loading">
          <div className="spinner" style={{ marginBottom: '15px' }}>🍳</div>
          <div>Aggregating platform growth data...</div>
        </div>
      ) : mergedData.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-main)' }}>No analytical metrics recorded within the selected period.</p>
        </div>
      ) : (
        <div className="charts-grid">
          {/* Biểu đồ lượng truy cập & tương tác người dùng */}
          <div className="chart-card">
            <h3>Customer Traffic & Engagement</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-main)" fontSize={12} />
                  <YAxis stroke="var(--text-main)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }} />
                  <Legend />
                  <Bar dataKey="New Customers" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Daily Active Users (DAU)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ xu hướng tuân thủ mục tiêu dinh dưỡng */}
          <div className="chart-card">
            <h3>Health Goal Achievement Trend</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-main)" fontSize={12} />
                  <YAxis stroke="var(--text-main)" fontSize={12} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Health Goal Rate (%)" stroke="var(--destructive)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 GẮN COMPONENT CON VÀO ĐÂY ĐỂ HIỂN THỊ TRÊN CÙNG MỘT PLATFORM ANALYTICS */}
      <ExpertPerformanceSection startDate={startDate} endDate={endDate} />
    </div>
  );
}
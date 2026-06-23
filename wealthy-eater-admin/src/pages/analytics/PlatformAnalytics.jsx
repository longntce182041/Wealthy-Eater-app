import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';
import './platformAnalytics.css';
import ExpertPerformanceSection from '../../components/ExpertPerformanceSection';
import FinancialTrendsSection from '../../components/FinancialTrendsSection';

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
    <div className="analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '40px', paddingBottom: '40px' }}>
      
      {/* ==========================================================================
          KHU VỰC 0: THANH ĐIỀU KHIỂN & BỘ LỌC THỜI GIAN (CONTROL PANEL)
          ========================================================================== */}
      <div className="analytics-header" style={{ borderBottom: '2px solid var(--border)', paddingBottom: '20px', marginBottom: '0' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-h)', margin: '0' }}>Platform Analytics Hub</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>Hệ thống kiểm toán tài chính vĩ mô và phân tích chỉ số tăng trưởng toàn nền tảng.</p>
        </div>
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
            <span style={{ verticalAlign: 'middle' }}>Refresh Dashboard</span>
          </button>
        </div>
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

      {/* ==========================================================================
          KHU VỰC 1: KIỂM TOÁN XU HƯỚNG TÀI CHÍNH DÒNG TIỀN (UC-59 - FINANCIAL AUDIT)
          ========================================================================== */}
      <section className="analytics-section-block" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ width: '4px', height: '20px', background: '#10b981', borderRadius: '2px' }}></div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-h)', margin: '0' }}>I. Financial Flow & Revenue Split</h3>
        </div>
        <FinancialTrendsSection startDate={startDate} endDate={endDate} />
      </section>

      {/* ==========================================================================
          KHU VỰC 2: TRAFFIC NGƯỜI DÙNG & CHỈ SỐ SỨC KHỎE (UC-57 - USER GROWTH)
          ========================================================================== */}
      <section className="analytics-section-block" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ width: '4px', height: '20px', background: 'var(--primary)', borderRadius: '2px' }}></div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-h)', margin: '0' }}>II. Customer Engagement & Dietary Growth</h3>
        </div>

        {loading ? (
          <div className="analytics-loading">
            <div className="spinner" style={{ marginBottom: '15px' }}>🍳</div>
            <div>Aggregating platform growth data...</div>
          </div>
        ) : mergedData.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-main)', margin: '0' }}>No analytical metrics recorded within the selected period.</p>
          </div>
        ) : (
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
            {/* Biểu đồ lượng truy cập & tương tác người dùng */}
            <div className="chart-card" style={{ margin: '0' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-h)' }}>Customer Traffic & Engagement</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
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
            <div className="chart-card" style={{ margin: '0' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-h)' }}>Health Goal Achievement Trend</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
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
      </section>

      {/* ==========================================================================
          KHU VỰC 3: HIỆU SUẤT VÀ KPI CHUYÊN GIA (EXPERT PERFORMANCE ANALYSIS)
          ========================================================================== */}
      <section className="analytics-section-block" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ width: '4px', height: '20px', background: '#3b82f6', borderRadius: '2px' }}></div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-h)', margin: '0' }}>III. Expert Performance Evaluation & KPIs</h3>
        </div>
        <ExpertPerformanceSection startDate={startDate} endDate={endDate} />
      </section>

    </div>
  );
}
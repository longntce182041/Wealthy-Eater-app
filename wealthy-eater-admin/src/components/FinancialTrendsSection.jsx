import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../services/api';

export default function FinancialTrendsSection({ startDate, endDate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [chartData, setChartData] = useState([]);

  const fetchFinancialTrends = useCallback(async () => {
    setLoading(false); // Đảm bảo không bị lặp trạng thái vô tận
    setLoading(true);
    setError('');
    try {
      // Gọi đúng endpoint API Admin UC-59 mà hai đứa mình làm hôm qua
      const res = await apiClient.get('/admin/analytics/financial-trends', {
        params: { startDate, endDate }
      });

      if (res.data?.success) {
        const { summary, trends } = res.data.data;
        setFinancialSummary(summary);
        
        // Chuẩn hóa dữ liệu map ra đúng các tên cột yêu cầu của đồ án
        const formattedTrends = (trends || []).map(item => ({
          date: item._id,
          'Gross Volume (GMV)': item.totalGrossRevenue,
          'Platform Revenue': item.totalPlatformFee,
          'Partner Payouts': item.totalNetDisbursement
        }));
        setChartData(formattedTrends);
      }
    } catch (err) {
      console.error('Error fetching financial trends:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load financial audit trends');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchFinancialTrends();
  }, [fetchFinancialTrends]);

  if (loading) {
    return (
      <div className="chart-card" style={{ marginTop: '30px', padding: '20px', textAlign: 'center' }}>
        <div>Auditing financial transaction flows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner" style={{ marginTop: '30px', padding: '15px' }}>
        <span>⚠️ {error}</span>
      </div>
    );
  }

  return (
    <div className="financial-audit-section" style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Hàng Thẻ Tóm Tắt Số Liệu Tài Chính Vĩ Mô */}
      {financialSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Circulation (GMV)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
              {financialSummary.totalGrossRevenue?.toLocaleString()} VND
            </div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Platform Revenue ({financialSummary.platformFeePercent}%)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '8px' }}>
              {financialSummary.totalPlatformFee?.toLocaleString()} VND
            </div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Partner Payouts</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginTop: '8px' }}>
              {financialSummary.totalNetDisbursement?.toLocaleString()} VND
            </div>
          </div>
          <div className="stat-card" style={{ padding: '20px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Audit Transactions</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-h)', marginTop: '8px' }}>
              {financialSummary.totalTransactionsCount} PAID
            </div>
          </div>
        </div>
      )}

      {/* 2. Biểu Đồ Xu Hướng Phân Tách Dòng Tiền */}
      <div className="chart-card" style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: 'var(--text-h)' }}>Financial Trends & Revenue Split</h3>
        <div className="chart-wrapper" style={{ width: '100%', height: 350 }}>
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No financial transactions recorded in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-main)" fontSize={12} />
                <YAxis stroke="var(--text-main)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }} />
                <Legend />
                {/* Tổng dòng tiền GMV */}
                <Bar dataKey="Gross Volume (GMV)" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                {/* Doanh thu thực tế của sàn */}
                <Bar dataKey="Platform Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                {/* Chi trả giải ngân chuyên gia */}
                <Bar dataKey="Partner Payouts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
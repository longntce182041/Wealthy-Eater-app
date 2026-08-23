//UC56 - System Dashboard: Real-Time System Statistics Component
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, CreditCard, TrendingUp, Percent } from 'lucide-react';
import apiClient from '../services/api';

export default function SystemStatsSection() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGMV: 0,
    platformRevenue: 0,
    expertPayoutPool: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    invoiceSuccessRate: 0
  });

  const fetchSystemStatistics = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API trực tiếp không kèm query param để lấy tổng All-Time
      const res = await apiClient.get('/admin/system-dashboard/system-statistics');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching real-time system stats inside component:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemStatistics();
  }, [fetchSystemStatistics]);

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // 🎯 ĐÃ SỬA: Format mảng đồ thị chuẩn đa cột của Recharts, map chuẩn đét với dữ liệu Postman
  const chartData = [
    {
      name: 'Financial Pipeline',
      'Gross Volume (GMV)': stats.totalGMV,
      'Platform Revenue (Fee)': stats.platformRevenue,
      'Experts Payout Pool': stats.expertPayoutPool
    }
  ];

  return (
    <div className="space-y-6">
      {/* 💳 HỆ THỐNG THẺ TIỀN TỆ (REAL-TIME CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex items-center justify-between p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Total GMV</span>
            <h3 className="text-lg font-bold text-[var(--text-h)]">{loading ? '...' : formatVND(stats.totalGMV)}</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Platform Revenue</span>
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{loading ? '...' : formatVND(stats.platformRevenue)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-xl"><DollarSign className="w-5 h-5" /></div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Expert Payout</span>
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">{loading ? '...' : formatVND(stats.expertPayoutPool)}</h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl"><CreditCard className="w-5 h-5" /></div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Invoice Success Rate</span>
            <h3 className="text-lg font-bold text-[var(--text-h)]">{loading ? '...' : `${stats.invoiceSuccessRate}%`}</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-500 rounded-xl"><Percent className="w-5 h-5" /></div>
        </div>
      </div>

      {/* 📊 BIỂU ĐỒ RECHARTS: DOANH THU TRÍCH TỪ PHÍ SÀN */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <h3 className="text-base font-semibold text-[var(--text-h)] mb-4 tracking-tight">Platform Revenue & Financial Flow Distribution</h3>
        <div className="w-full h-[320px]">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-[var(--text-muted)]">Calculating financial pipelines...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-main)" fontSize={11} />
                <YAxis stroke="var(--text-main)" fontSize={11} />
                <Tooltip 
                  formatter={(value) => formatVND(value)}
                  contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', color: 'var(--text-h)' }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {/* 🎯 ĐÃ SỬA: dataKey trùng khớp hoàn toàn với các trường dữ liệu định nghĩa trong mảng chartData */}
                <Bar dataKey="Gross Volume (GMV)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Platform Revenue (Fee)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Experts Payout Pool" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
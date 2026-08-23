// UC58 - Expert Performance Evaluation Component for Admin Dashboard
import { useState, useEffect, useCallback } from "react";
import { Search, Star, Users, UserPlus, TrendingUp, DollarSign } from "lucide-react";
import apiClient from "../services/api"; 
import { toast } from "react-hot-toast";
import { DataTable, DataTableRow, DataTableCell } from "./ui/DataTable";
import { LoadingState } from "./ui/LoadingState";
import { EmptyState } from "./ui/EmptyState";

const errorStyle = {
  style: { background: '#dc2626', color: '#ffffff' }
};

export default function ExpertPerformanceSection({ startDate, endDate }) {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  const fetchExpertPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/analytics/expert-performance', {
        params: { startDate, endDate }
      });
      if (res.data?.success) {
        setExperts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching expert performance:', err);
      toast.error("Failed to load expert performance metrics", errorStyle);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchExpertPerformance();
  }, [fetchExpertPerformance]);

  const filteredExperts = experts.filter(expert => 
    expert.email?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    expert.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    expert.expertId?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const renderStars = (rating) => {
    const stars = [];
    const floorRating = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`w-4 h-4 ${i <= floorRating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600'}`} 
        />
      );
    }
    return (
      <div className="flex items-center gap-0.5">
        {stars} 
        <span className="text-xs font-semibold ml-1 text-[var(--text-main)]">({rating})</span>
      </div>
    );
  };

  return (
    <div className="expert-kpi-container" style={{ marginTop: '40px' }}>
      <hr style={{ borderColor: 'var(--border)', marginBottom: '30px' }} />
      
      <div className="analytics-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ color: 'var(--text-h)', margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ color: 'var(--primary)', width: '20px', height: '20px' }} />
            Expert Performance Evaluation (KPI)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
            Monitor nutritionist active clients, rental acquisition, satisfaction ratings, and net revenue payouts.
          </p>
        </div>

        <div className="relative" style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
          <Search className="search-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search expert by email or name..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <DataTable
        headers={["Expert Account", "Active Clients", "New Rentals", "Satisfaction Rating", "Total Payout"]}
        emptyState={
          <tr>
            <td colSpan="5" className="p-0">
              {loading ? (
                <LoadingState text="Calculating expert performance KPI pipelines..." />
              ) : (
                <EmptyState icon={Users} title="No expert data found" description="There are no active contracts or metrics available for the selected period." />
              )}
            </td>
          </tr>
        }
      >
        {!loading && filteredExperts.map((expert) => (
          <DataTableRow key={expert.expertId}>
            <DataTableCell>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-h)' }}>{expert.name || expert.email.split('@')[0]}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expert.email}</span>
              </div>
            </DataTableCell>

            <DataTableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users style={{ width: '16px', height: '16px', color: '#10b981' }} />
                <span style={{ fontWeight: '700', color: 'var(--text-h)' }}>{expert.activeCustomers}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>clients</span>
              </div>
            </DataTableCell>

            <DataTableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
                <span style={{ fontWeight: '700', color: 'var(--text-h)' }}>+{expert.newRentals}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>subs</span>
              </div>
            </DataTableCell>

            <DataTableCell>
              {renderStars(expert.averageRating)}
            </DataTableCell>

            <DataTableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '700', color: '#059669', fontSize: '0.9rem' }}>
                  {formatVND(expert.totalPayout)}
                </span>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
    </div>
  );
}
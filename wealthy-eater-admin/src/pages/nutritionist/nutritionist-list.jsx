import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api'; 
import ExpertProfileDetail from './expert-profile-detail';
import { 
  Users, 
  RefreshCw, 
  Search, 
  SearchX, 
  AlertCircle,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  Award,
  Mail,
  FileText,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  Unlock
} from 'lucide-react';

export default function NutritionistListPage() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const rawUser = localStorage.getItem('admin_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });

  const [nutritionists, setNutritionists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // UC-85 subview state for detailed profile inspection
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  
  // Tab filtering matching database enums: ALL | PENDING | APPROVED | REJECTED | SUSPENDED | BANNED
  const [activeTab, setActiveTab] = useState('ALL');

  // Sorting & Pagination state
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleForceLogout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }, [navigate]);

  const fetchNutritionists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/nutritionists');
      if (response.data?.success && Array.isArray(response.data.data)) {
        setNutritionists(response.data.data);
      } else if (Array.isArray(response.data)) {
        setNutritionists(response.data);
      } else {
        setNutritionists([]);
      }
    } catch (err) {
      console.error('Error fetching nutritionists:', err);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Session expired. Please log in again.');
        handleForceLogout();
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to load nutritionists directory.');
    } finally {
      setLoading(false);
    }
  }, [handleForceLogout]);

  useEffect(() => {
    const rawUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_session_jwt_token');

    if (!rawUser || !token) {
      handleForceLogout();
      return;
    }
    fetchNutritionists();
  }, [handleForceLogout, fetchNutritionists]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Helper đồng bộ để lấy Status chuẩn nhất của Chuyên gia
  const getEffectiveStatus = (item) => {
    const userStatus = item.userStatus?.toUpperCase() || item.status?.toUpperCase();
    if (userStatus === 'SUSPENDED' || userStatus === 'BANNED') return userStatus;
    
    return item.approvalStatus?.toUpperCase() || userStatus || 'PENDING';
  };

  // Handler for Approval / Suspension / Activation (Đồng bộ chuẩn hóa với BE)
  async function handleProcessApproval(id, actionStatus) {
    let actionText = 'UPDATE STATUS';
    if (actionStatus === 'APPROVED') actionText = 'APPROVE PROFILE';
    if (actionStatus === 'REJECTED') actionText = 'REJECT PROFILE';
    if (actionStatus === 'SUSPENDED' || actionStatus === 'BANNED') actionText = 'SUSPEND ACCOUNT';
    if (actionStatus === 'REACTIVATE') actionText = 'REACTIVATE ACCOUNT';

    let rejectionReason = '';
    // Nếu là Từ chối profile, hỏi lý do gửi mail cho người dùng
    if (actionStatus === 'REJECTED') {
      rejectionReason = window.prompt('Please enter the reason for rejection (will be sent via email):', 'Profile or certificates do not meet verification standards.');
      if (rejectionReason === null) return; // Bấm Cancel thì dừng
    } else {
      if (!window.confirm(`Are you sure you want to perform this action: ${actionText}?`)) return;
    }

    try {
      let endpoint = `/admin/nutritionists/${id}/verify`;
      let payload = {};

      if (actionStatus === 'APPROVED') {
        payload = { action: 'APPROVE', approvalStatus: 'APPROVED' };
      } else if (actionStatus === 'REJECTED') {
        payload = { action: 'REJECT', approvalStatus: 'REJECTED', rejectionReason };
      } else if (actionStatus === 'SUSPENDED' || actionStatus === 'BANNED') {
        endpoint = `/admin/nutritionists/${id}/approval`;
        payload = { status: 'suspend', approvalStatus: 'SUSPENDED' };
      } else if (actionStatus === 'REACTIVATE') {
        endpoint = `/admin/nutritionists/${id}/approval`;
        payload = { status: 'active', approvalStatus: 'APPROVED' };
      }

      const response = await apiClient.put(endpoint, payload);

      if (response.data?.success || response.status === 200) {
        alert(response.data?.message || 'Nutritionist status updated successfully!');
        fetchNutritionists();
      } else {
        alert(response.data?.message || 'An error occurred.');
      }
    } catch (err) {
      console.error('Update status error:', err);
      alert(err?.response?.data?.message || err.message || 'Failed to update status.');
    }
  }

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getAvatarInitial = (name) => {
    if (!name) return 'N';
    const cleanName = name.replace(/^(Dr\.|Doctor|Prof\.|Bác sĩ)\s+/i, '').trim();
    return cleanName.charAt(0).toUpperCase() || 'N';
  };

  const filteredNutritionists = nutritionists.filter(item => {
    const nameStr = item.fullName || '';
    const emailStr = item.email || '';
    const licenseStr = item.licenseNumber || '';
    const matchesSearch = emailStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          licenseStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab !== 'ALL') {
      const currentStatus = getEffectiveStatus(item);
      matchesTab = currentStatus === activeTab;
    }

    return matchesSearch && matchesTab;
  });

  const sortedNutritionists = [...filteredNutritionists].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === 'createdAt') {
      return sortConfig.direction === 'asc'
        ? new Date(aValue || 0) - new Date(bValue || 0)
        : new Date(bValue || 0) - new Date(aValue || 0);
    }

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue || '')
        : (bValue || '').localeCompare(aValue);
    }

    return sortConfig.direction === 'asc'
      ? (aValue || 0) - (bValue || 0)
      : (bValue || 0) - (aValue || 0);
  });

  const totalItems = sortedNutritionists.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNutritionists = sortedNutritionists.slice(startIndex, startIndex + itemsPerPage);

  const countByStatus = (statusType) => {
    if (statusType === 'ALL') return nutritionists.length;
    return nutritionists.filter(item => getEffectiveStatus(item) === statusType).length;
  };

  if (!user) return null;

  if (selectedExpertId) {
    return (
      <ExpertProfileDetail 
        expertId={selectedExpertId} 
        onBack={() => setSelectedExpertId(null)} 
        onStatusUpdated={fetchNutritionists}
      />
    );
  }

  return (
    <div className="w-full space-y-6 text-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight m-0 flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-600" /> Nutritionists Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Filtered: <strong className="text-emerald-600">{filteredNutritionists.length}</strong> / Total: <strong>{nutritionists.length}</strong> nutritionists in system.
          </p>
        </div>
        <div>
          <button 
            onClick={fetchNutritionists} 
            disabled={loading}
            className="flex items-center px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Filter Navigation */}
      <div className="border-b border-slate-200 flex flex-wrap gap-1">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'REJECTED', label: 'Rejected' },
          { id: 'SUSPENDED', label: 'Suspended' },
          { id: 'BANNED', label: 'Banned' },
        ].map((tab) => {
          const count = countByStatus(tab.id);
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-semibold text-sm transition-all border-b-2 bg-transparent cursor-pointer -mb-[2px] ${
                isSelected
                  ? 'border-emerald-500 text-emerald-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex items-center">
        <Search className="absolute left-3 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name, email, license number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
        />
        {searchTerm && (
          <button 
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600 min-w-[900px]">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th onClick={() => requestSort('fullName')} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[220px]">
                  <div className="flex items-center gap-1">Nutritionist <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-5 py-4">Account & License</th>
                <th className="px-5 py-4">Specialization</th>
                <th onClick={() => requestSort('serviceFee')} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div className="flex items-center gap-1">Service Fee <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th onClick={() => requestSort('averageRating')} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div className="flex items-center gap-1">Rating <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && nutritionists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Syncing data from server...
                  </td>
                </tr>
              ) : paginatedNutritionists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-base text-slate-700 m-0">No nutritionists found</p>
                  </td>
                </tr>
              ) : (
                paginatedNutritionists.map((expert) => {
                  const expertId = expert._id || expert.id;
                  const appStatus = getEffectiveStatus(expert);
                  
                  let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (appStatus === 'APPROVED' || appStatus === 'APPROVAL') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (appStatus === 'PENDING') statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                  if (appStatus === 'REJECTED' || appStatus === 'REJECT') statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                  if (appStatus === 'SUSPENDED') statusBadge = 'bg-orange-50 text-orange-700 border-orange-200';
                  if (appStatus === 'BANNED') statusBadge = 'bg-red-100 text-red-800 border-red-300';

                  return (
                    <tr key={expertId} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Joined Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center font-bold shrink-0">
                            {getAvatarInitial(expert.fullName)}
                          </div>
                          <div className="flex flex-col max-w-[160px]">
                            <span className="font-bold text-slate-800 truncate" title={expert.fullName}>
                              {expert.fullName || 'Unassigned Name'}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {expert.createdAt ? new Date(expert.createdAt).toLocaleDateString('en-US') : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email & License Number */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-700 break-all">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {expert.email}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit font-mono">
                            No: {expert.licenseNumber || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Specialization */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {expert.professionalTitle || 'Nutritionist'}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{expert.specialization || 'General Nutrition'}</span>
                        </div>
                      </td>

                      {/* Service Fee */}
                      <td className="px-5 py-4 font-bold text-slate-900">
                        <span className="inline-flex items-center text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                          {expert.serviceFee ? expert.serviceFee.toLocaleString('en-US') : '0'} VND
                        </span>
                      </td>

                    {/* Rating */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        {Number(expert.averageRating || 0).toFixed(1)}
                      </span>
                    </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${statusBadge}`}>
                          {appStatus || 'PENDING'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* View Detail */}
                          <button 
                            type="button"
                            title="View detailed profile"
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            onClick={() => setSelectedExpertId(expertId)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* View Certificate */}
                          {expert.certificationUrl ? (
                            <a 
                              href={expert.certificationUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              title="Open original certificate file"
                              className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : (
                            <button 
                              disabled 
                              title="No certificate attached"
                              className="p-1.5 bg-slate-50 text-slate-300 rounded-md border border-slate-100 opacity-50"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Actions for PENDING */}
                          {appStatus === 'PENDING' && (
                            <>
                              <button 
                                type="button"
                                title="Approve profile"
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expertId, 'APPROVED')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                title="Reject profile"
                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md border border-red-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expertId, 'REJECTED')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Actions for APPROVED */}
                          {appStatus === 'APPROVED' && (
                            <button 
                              type="button"
                              title="Suspend account"
                              className="flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md px-2 py-1 text-xs font-bold cursor-pointer"
                              onClick={() => handleProcessApproval(expertId, 'SUSPENDED')}
                            >
                              <Lock className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}

                          {/* Actions for REJECTED / SUSPENDED / BANNED */}
                          {(appStatus === 'REJECTED' || appStatus === 'SUSPENDED' || appStatus === 'BANNED') && (
                            <button 
                              type="button"
                              title="Reactivate account"
                              className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2 py-1 text-xs font-bold cursor-pointer"
                              onClick={() => handleProcessApproval(expertId, 'REACTIVATE')}
                            >
                              <Unlock className="w-3.5 h-3.5" /> Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalItems > itemsPerPage && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
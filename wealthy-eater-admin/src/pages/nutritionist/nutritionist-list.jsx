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
  DollarSign,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert
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
  
  // Trạng thái quản lý Subview xem chi tiết hồ sơ năng lực (UC-85)
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  
  // Phân tầng theo trạng thái duyệt của database thực tế: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [activeTab, setActiveTab] = useState('ALL');

  // Trạng thái Sắp xếp & Phân trang dữ liệu
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ⚡ TRẠNG THÁI QUẢN LÝ POP-UP KỶ LUẬT CHUYÊN GIA (UC-86)
  const [banModal, setBanModal] = useState({
    isOpen: false,
    expertId: null,
    expertName: '',
    banType: 'SUSPENDED', // Mặc định khóa tạm thời: 'SUSPENDED' | 'BANNED'
    reason: ''
  });

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
      console.log("Dữ liệu chuyên gia chuẩn cấu trúc:", response.data);

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
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        handleForceLogout();
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to load nutritionists directory');
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

  // Reset trang về 1 khi đổi bộ lọc tìm kiếm hoặc đổi Tab
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Hành động Admin Duyệt hồ sơ chuyên gia trực tiếp từ Frontend công khai
  async function handleProcessApproval(id, actionStatus) {
    if (!window.confirm(`Bạn có chắc chắn muốn kích hoạt hành động này?`)) return;

    try {
      const response = await apiClient.put(`/admin/nutritionists/${id}/approval`, {
        approvalStatus: actionStatus
      });

      if (response.data?.success) {
        alert('Cập nhật trạng thái duyệt hồ sơ chuyên gia thành công!');
        fetchNutritionists();
      } else {
        alert(response.data?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Không thể cập nhật trạng thái');
    }
  }

  // ⚡ XỬ LÝ GỬI YÊU CẦU BAN/LOCK CHUYÊN GIA LÊN BACKEND (UC-86)
  const handleConfirmBanSubmit = async (e) => {
    e.preventDefault();
    if (!banModal.reason.trim()) {
      alert('Bắt buộc phải nhập lý do vi phạm đạo đức nghề nghiệp!');
      return;
    }

    try {
      const response = await apiClient.put(`/admin/nutritionists/${banModal.expertId}/approval`, {
        approvalStatus: banModal.banType,
        reason: banModal.reason.trim()
      });

      if (response.data?.success) {
        alert(`Đã thực thi hình thức kỷ luật [${banModal.banType === 'SUSPENDED' ? 'KHÓA TẠM THỜI' : 'KHÓA VĨNH VIỄN'}] thành công!`);
        // Reset trạng thái đóng modal
        setBanModal({ isOpen: false, expertId: null, expertName: '', banType: 'SUSPENDED', reason: '' });
        fetchNutritionists(); // Tải lại bảng dữ liệu
      } else {
        alert(response.data?.message || 'Có lỗi xảy ra trong quá trình xử lý kỷ luật.');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Không thể cập nhật hình thức xử lý');
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Bộ lọc kết hợp tìm kiếm Text & Phân loại Tab
  const filteredNutritionists = nutritionists.filter(item => {
    const nameStr = item.fullName || '';
    const emailStr = item.email || '';
    const licenseStr = item.licenseNumber || '';
    const matchesSearch = emailStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          licenseStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab !== 'ALL') {
      const currentStatus = item.approvalStatus?.toUpperCase();
      if (activeTab === 'REJECTED') {
        // Nhóm các trạng thái bị khóa/từ chối chung vào 1 Tab để admin dễ quản lý diện rộng
        matchesTab = ['REJECTED', 'REJECT', 'SUSPENDED', 'BANNED'].includes(currentStatus);
      } else {
        matchesTab = currentStatus === activeTab;
      }
    }

    return matchesSearch && matchesTab;
  });

  // Sắp xếp mượt mà trên Client trước khi Phân trang
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

  // Phân đoạn mảng theo Phân trang thực tế
  const totalItems = sortedNutritionists.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNutritionists = sortedNutritionists.slice(startIndex, startIndex + itemsPerPage);

  const countByStatus = (statusType) => {
    if (statusType === 'ALL') return nutritionists.length;
    if (statusType === 'REJECTED') {
      return nutritionists.filter(item => ['REJECTED', 'REJECT', 'SUSPENDED', 'BANNED'].includes(item.approvalStatus?.toUpperCase())).length;
    }
    return nutritionists.filter(item => item.approvalStatus?.toUpperCase() === statusType).length;
  };

  if (!user) return null;

  // NẾU CÓ CHỌN EXPERT -> ĐỔI SANG VIEW CHI TIẾT (UC-85) NGAY TẠI CHỖ
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0 flex items-center gap-2">
            <Users className="w-8 h-8 text-emerald-600" /> Nutritionists Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Kết quả lọc hồ sơ: <strong className="text-emerald-600">{filteredNutritionists.length}</strong> / Tổng số: <strong>{nutritionists.length}</strong> chuyên gia trong hệ thống.
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

      {/* 🗂️ Phân loại Tab */}
      <div className="border-b border-slate-200 flex flex-wrap gap-1">
        {[
          { id: 'ALL', label: 'Tất cả chuyên gia' },
          { id: 'PENDING', label: 'Chờ duyệt hồ sơ' },
          { id: 'APPROVED', label: 'Đã duyệt (Active)' },
          { id: 'REJECTED', label: 'Bị khóa / Từ chối' },
        ].map((tab) => {
          const count = countByStatus(tab.id);
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 bg-transparent cursor-pointer -mb-[2px] ${
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

      {/* Thanh Tìm Kiếm */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex items-center">
        <Search className="absolute left-3 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Tìm theo tên, email, số giấy phép chứng chỉ..."
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

      {/* Bảng Dữ Liệu Thuần */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th onClick={() => requestSort('fullName')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div className="flex items-center gap-1">Chuyên Gia <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4">Tài khoản & Bằng cấp</th>
                <th className="px-6 py-4">Chuyên Môn</th>
                <th onClick={() => requestSort('serviceFee')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div className="flex items-center gap-1">Phí Tư Vấn <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th onClick={() => requestSort('averageRating')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors">
                  <div className="flex items-center gap-1">Đánh Giá <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4">Trạng Thái Duyệt</th>
                <th className="px-6 py-4 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && nutritionists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Đang đồng bộ dữ liệu từ MongoDB...
                  </td>
                </tr>
              ) : paginatedNutritionists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-base text-slate-700 m-0">Không tìm thấy dữ liệu chuyên gia</p>
                  </td>
                </tr>
              ) : (
                paginatedNutritionists.map((expert) => {
                  const expertId = expert._id || expert.id;
                  
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  const appStatus = expert.approvalStatus?.toUpperCase();
                  if (appStatus === 'APPROVED' || appStatus === 'APPROVAL') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  if (appStatus === 'PENDING') statusBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (appStatus === 'SUSPENDED') statusBadge = 'bg-orange-50 text-orange-700 border border-orange-100';
                  if (appStatus === 'BANNED' || appStatus === 'REJECTED' || appStatus === 'REJECT') statusBadge = 'bg-red-50 text-red-700 border border-red-100';

                  return (
                    <tr key={expertId} className="hover:bg-slate-50/50 transition-colors">
                      {/* Họ Tên */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
                           {expert.fullName?.charAt(0)?.toUpperCase() || "N"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 line-clamp-1">{expert.fullName}</span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {expert.createdAt ? new Date(expert.createdAt).toLocaleDateString('vi-VN') : '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tài khoản */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-700 break-all">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {expert.email}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit font-mono">
                            No: {expert.licenseNumber || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Chuyên môn */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {expert.professionalTitle || 'Chuyên gia'}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{expert.specialization || 'Dinh dưỡng chung'}</span>
                        </div>
                      </td>

                      {/* Phí dịch vụ */}
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          <DollarSign className="w-3 h-3 text-slate-500 mr-0.5" />
                          {expert.serviceFee ? expert.serviceFee.toLocaleString('vi-VN') : '0'} VND
                        </span>
                      </td>

                      {/* Đánh Giá */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {expert.averageRating ? expert.averageRating.toFixed(1) : '0.0'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${statusBadge}`}>
                          {expert.approvalStatus || 'PENDING'}
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          <button 
                            type="button"
                            title="Thẩm định chi tiết hồ sơ năng lực"
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            onClick={() => setSelectedExpertId(expertId)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {expert.certificationUrl && (
                            <a 
                              href={expert.certificationUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              title="Mở link file ảnh chứng chỉ gốc"
                              className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          )}

                          {/* Phê duyệt hồ sơ chờ duyệt */}
                          {expert.approvalStatus?.toUpperCase() === 'PENDING' && (
                            <>
                              <button 
                                type="button"
                                title="Duyệt nhanh hồ sơ"
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expertId, 'APPROVED')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                title="Từ chối nhanh hồ sơ"
                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expertId, 'REJECTED')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* ⚡ NÚT KÍCH HOẠT UC-86: KHÓA KÈM LÝ DO QUA POP-UP MODAL */}
                          {expert.approvalStatus?.toUpperCase() === 'APPROVED' && (
                            <button 
                              type="button"
                              title="Khóa kỷ luật chuyên gia"
                              className="bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer text-xs font-bold px-2 py-1"
                              onClick={() => setBanModal({
                                isOpen: true,
                                expertId: expertId,
                                expertName: expert.fullName || 'Chuyên gia',
                                banType: 'SUSPENDED',
                                reason: ''
                              })}
                            >
                              Khóa tài khoản
                            </button>
                          )}

                          {/* Tài khoản đang bị Khóa / Từ chối -> Mở lại */}
                          {['REJECTED', 'SUSPENDED', 'BANNED', 'REJECT'].includes(expert.approvalStatus?.toUpperCase()) && (
                            <button 
                              type="button"
                              title="Kích hoạt lại tài khoản"
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer text-xs font-bold px-2 py-1"
                              onClick={() => handleProcessApproval(expertId, 'APPROVED')}
                            >
                              Kích hoạt lại
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

        {/* Thanh Điều Hướng Phân Trang */}
        {totalItems > itemsPerPage && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> trên tổng số <strong>{totalItems}</strong> kết quả
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
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
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ UI POP-UP MODAL XỬ LÝ KỶ LUẬT CHUYÊN GIA (UC-86) */}
      {banModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header Modal */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 font-bold text-base">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Quyết định xử lý kỷ luật
              </div>
              <button 
                type="button" 
                onClick={() => setBanModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Modal Body */}
            <form onSubmit={handleConfirmBanSubmit} className="p-6 flex flex-col space-y-4 m-0">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider m-0">Chuyên gia áp dụng:</p>
                <p className="text-base font-bold text-slate-800 mt-1 m-0">{banModal.expertName}</p>
              </div>

              {/* Hình thức khóa tài khoản */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Hình thức xử phạt:</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    banModal.banType === 'SUSPENDED' 
                      ? 'border-orange-500 bg-orange-50/50 font-bold text-orange-700' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="banType" 
                      value="SUSPENDED"
                      checked={banModal.banType === 'SUSPENDED'}
                      onChange={(e) => setBanModal(prev => ({ ...prev, banType: e.target.value }))}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-xs">Khóa tạm thời</span>
                  </label>

                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                    banModal.banType === 'BANNED' 
                      ? 'border-red-500 bg-red-50/50 font-bold text-red-700' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input 
                      type="radio" 
                      name="banType" 
                      value="BANNED"
                      checked={banModal.banType === 'BANNED'}
                      onChange={(e) => setBanModal(prev => ({ ...prev, banType: e.target.value }))}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs">Khóa vĩnh viễn</span>
                  </label>
                </div>
              </div>

              {/* Ô nhập lý do vi phạm */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>Lý do vi phạm đạo đức nghề nghiệp:</span>
                  <span className="text-xs font-normal text-red-500">* Bắt buộc</span>
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Nhập chi tiết hành vi vi phạm (Ví dụ: Tư vấn sai lệch quy chuẩn y khoa, nhận phản hồi xấu liên tục từ người bệnh, gian lận bằng cấp...)"
                  value={banModal.reason}
                  onChange={(e) => setBanModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 placeholder-slate-400 bg-transparent resize-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBanModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={!banModal.reason.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Xác nhận khóa
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
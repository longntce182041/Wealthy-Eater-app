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
  X
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
  
  // ⚡ Trạng thái quản lý Subview xem chi tiết hồ sơ năng lực (UC-85)
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  
  // Phân tầng theo trạng thái duyệt của database thực tế: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [activeTab, setActiveTab] = useState('ALL');

  // 🛠️ BỔ SUNG: Trạng thái Sắp xếp & Phân trang dữ liệu
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

  // Hành động Admin Duyệt / Từ chối hồ sơ chuyên gia trực tiếp từ Frontend
  async function handleProcessApproval(id, actionStatus) {
    const actionText = actionStatus === 'APPROVED' ? 'DUYỆT HỒ SƠ CHÍNH THỨC' : 'TỪ CHỐI HỒ SƠ';
    if (!window.confirm(`Bạn có chắc chắn muốn thực hiện hành động: ${actionText}?`)) return;

    try {
      // Gọi API cập nhật trạng thái duyệt ở Backend
      const response = await apiClient.put(`/admin/nutritionists/${id}/approval`, {
        approvalStatus: actionStatus
      });

      if (response.data?.success) {
        alert('Cập nhật trạng thái duyệt hồ sơ chuyên gia thành công!');
        fetchNutritionists(); // Tải lại bảng dữ liệu mới nhất
      } else {
        alert(response.data?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Không thể cập nhật trạng thái');
    }
  }

  // 🛠️ BỔ SUNG: Hàm xử lý thay đổi logic Sort dữ liệu
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
      matchesTab = item.approvalStatus?.toUpperCase() === activeTab;
    }

    return matchesSearch && matchesTab;
  });

  // 🛠️ BỔ SUNG: Xử lý Sắp xếp mượt mà trên Client trước khi Phân trang
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

    // Các trường dữ liệu số (Phí dịch vụ, Đánh giá sao)
    return sortConfig.direction === 'asc'
      ? (aValue || 0) - (bValue || 0)
      : (bValue || 0) - (aValue || 0);
  });

  // 🛠️ BỔ SUNG: Phân đoạn mảng theo Phân trang thực tế
  const totalItems = sortedNutritionists.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNutritionists = sortedNutritionists.slice(startIndex, startIndex + itemsPerPage);

  const countByStatus = (statusType) => {
    if (statusType === 'ALL') return nutritionists.length;
    return nutritionists.filter(item => item.approvalStatus?.toUpperCase() === statusType).length;
  };

  if (!user) return null;

  // 🔄 NẾU CÓ CHỌN EXPERT -> ĐỔI SANG VIEW CHI TIẾT (UC-85) NGAY TẠI CHỖ
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

      {/* 🗂️ Phân loại Tab đồng bộ đúng Enums Database */}
      <div className="border-b border-slate-200 flex flex-wrap gap-1">
        {[
          { id: 'ALL', label: 'Tất cả chuyên gia' },
          { id: 'PENDING', label: 'Chờ duyệt hồ sơ' },
          { id: 'APPROVED', label: 'Đã duyệt (Active)' },
          { id: 'REJECTED', label: 'Đã từ chối' },
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

      {/* Thanh Tìm Kiếm kèm nút Xóa Nhanh */}
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
                  // Fallback ID an toàn cho cả cấu trúc id lẫn _id từ MongoDB
                  const expertId = expert._id || expert.id;
                  
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  const appStatus = expert.approvalStatus?.toUpperCase();
                  if (appStatus === 'APPROVED' || appStatus === 'APPROVAL') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  if (appStatus === 'PENDING') statusBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (appStatus === 'REJECTED' || appStatus === 'REJECT') statusBadge = 'bg-red-50 text-red-700 border border-red-100';

                  return (
                    <tr key={expertId} className="hover:bg-slate-50/50 transition-colors">
                      {/* Họ Tên & Ngày tham gia */}
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

                      {/* Email & Giấy phép nghề nghiệp */}
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

                      {/* Chuyên môn / Danh hiệu */}
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

                      {/* Rating đánh giá trung bình */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {expert.averageRating ? expert.averageRating.toFixed(1) : '0.0'}
                        </span>
                      </td>

                      {/* Trạng thái duyệt hồ sơ */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${statusBadge}`}>
                          {expert.approvalStatus || 'PENDING'}
                        </span>
                      </td>

                      {/* Hành động quản trị Duyệt / Hủy / Xem Hồ Sơ Năng Lực */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* 👁️ NÚT KÍCH HOẠT UC-85: XEM CHI TIẾT HỒ SƠ CHUYÊN SÂU */}
                          <button 
                            type="button"
                            title="Thẩm định chi tiết hồ sơ năng lực"
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            onClick={() => setSelectedExpertId(expertId)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Nút kiểm tra tài liệu URL chứng chỉ thô (Dự phòng) */}
                          {expert.certificationUrl ? (
                            <a 
                              href={expert.certificationUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              title="Mở link file ảnh chứng chỉ gốc"
                              className="p-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : (
                            <button 
                              disabled 
                              title="Không có file đính kèm"
                              className="p-1.5 bg-slate-50 text-slate-300 rounded-md border border-slate-100 opacity-50"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Nút hành động phê duyệt nhanh */}
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

                          {expert.approvalStatus?.toUpperCase() === 'APPROVED' && (
                            <button 
                              type="button"
                              title="Khóa hồ sơ"
                              className="bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer text-xs font-semibold px-2 py-1"
                              onClick={() => handleProcessApproval(expertId, 'REJECTED')}
                            >
                              Khóa
                            </button>
                          )}

                          {expert.approvalStatus?.toUpperCase() === 'REJECTED' && (
                            <button 
                              type="button"
                              title="Kích hoạt lại hồ sơ"
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer text-xs font-semibold px-2 py-1"
                              onClick={() => handleProcessApproval(expertId, 'APPROVED')}
                            >
                              Mở
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

        {/* 🛠️ BỔ SUNG: UI Thanh Điều Hướng Phân Trang Giao Diện */}
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
    </div>
  );
}
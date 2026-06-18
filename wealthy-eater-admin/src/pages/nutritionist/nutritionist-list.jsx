import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api'; 
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
  Star
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
  
  // Phân tầng theo trạng thái duyệt của database thực tế: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [activeTab, setActiveTab] = useState('ALL');

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

  const countByStatus = (statusType) => {
    if (statusType === 'ALL') return nutritionists.length;
    return nutritionists.filter(item => item.approvalStatus?.toUpperCase() === statusType).length;
  };

  if (!user) return null;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0">Nutritionists Management</h1>
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

      {/* Thanh Tìm Kiếm */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Tìm theo tên, email, số giấy phép chứng chỉ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-transparent border-none focus:outline-none"
        />
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
                <th className="px-6 py-4">Chuyên Gia</th>
                <th className="px-6 py-4">Tài khoản & Bằng cấp</th>
                <th className="px-6 py-4">Chuyên Môn</th>
                <th className="px-6 py-4">Phí Tư Vấn</th>
                <th className="px-6 py-4">Đánh Giá</th>
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
              ) : filteredNutritionists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-base text-slate-700 m-0">Không tìm thấy dữ liệu chuyên gia</p>
                  </td>
                </tr>
              ) : (
                filteredNutritionists.map((expert) => {
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  const appStatus = expert.approvalStatus?.toUpperCase();
                  if (appStatus === 'APPROVED' || appStatus === 'APPROVAL') statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  if (appStatus === 'PENDING') statusBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (appStatus === 'REJECTED' || appStatus === 'REJECT') statusBadge = 'bg-red-50 text-red-700 border border-red-100';

                  return (
                    <tr key={expert.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Họ Tên & Ngày tham gia */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
                           {expert.fullName?.charAt(0)?.toUpperCase() || "N"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{expert.fullName}</span>
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
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> {expert.email}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit font-mono">
                            No: {expert.licenseNumber}
                          </span>
                        </div>
                      </td>

                      {/* Chuyên môn / Danh hiệu */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" /> {expert.professionalTitle}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5">{expert.specialization}</span>
                        </div>
                      </td>

                      {/* Phí dịch vụ */}
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          <DollarSign className="w-3 h-3 text-slate-500 mr-0.5" />
                          {expert.serviceFee.toLocaleString('vi-VN')} VND
                        </span>
                      </td>

                      {/* Rating đánh giá trung bình */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {expert.averageRating.toFixed(1)}
                        </span>
                      </td>

                      {/* Trạng thái duyệt hồ sơ */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${statusBadge}`}>
                          {expert.approvalStatus}
                        </span>
                      </td>

                      {/* Hành động quản trị Duyệt / Hủy / Xem bằng */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút kiểm tra tài liệu URL chứng chỉ */}
                          {expert.certificationUrl ? (
                            <a 
                              href={expert.certificationUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              title="Mở link file chứng chỉ cấp phép"
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

                          {/* Nút hành động thay đổi trạng thái Approve / Reject */}
                          {expert.approvalStatus?.toUpperCase() === 'PENDING' && (
                            <>
                              <button 
                                type="button"
                                title="Duyệt hồ sơ này"
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expert.id, 'APPROVED')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                type="button"
                                title="Từ chối hồ sơ này"
                                className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer"
                                onClick={() => handleProcessApproval(expert.id, 'REJECTED')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {expert.approvalStatus?.toUpperCase() === 'APPROVED' && (
                            <button 
                              type="button"
                              title="Hủy tư cách/Khóa hồ sơ về Từ chối"
                              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors border border-red-200 cursor-pointer text-xs font-semibold px-2"
                              onClick={() => handleProcessApproval(expert.id, 'REJECTED')}
                            >
                              Khóa
                            </button>
                          )}

                          {expert.approvalStatus?.toUpperCase() === 'REJECTED' && (
                            <button 
                              type="button"
                              title="Cấp lại quyền / Duyệt lại hồ sơ"
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 cursor-pointer text-xs font-semibold px-2"
                              onClick={() => handleProcessApproval(expert.id, 'APPROVED')}
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
      </div>
    </div>
  );
}
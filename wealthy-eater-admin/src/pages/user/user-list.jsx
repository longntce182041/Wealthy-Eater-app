import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api'; 
import { 
  Users, 
  RefreshCw, 
  Search, 
  SearchX, 
  AlertCircle, 
  UserPlus,
  X,
  Mail,
  Shield,
  ToggleLeft
} from 'lucide-react';

export default function UserListPage() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const rawUser = localStorage.getItem('admin_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 🔍 Bộ lọc tìm kiếm tại Frontend
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // ⚡ STATES QUẢN LÝ FORM CREATE USER (UC-78)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'customer', status: 'active' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleForceLogout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }, [navigate]);

  // Gọi API lấy danh sách người dùng
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/users');
      
      console.log("Dữ liệu nhận từ Backend đồng bộ:", response.data);

      if (response.data?.success && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
      } else if (Array.isArray(response.data?.data)) {
        setUsers(response.data.data);
      } else if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        console.warn("Cấu trúc trả về không phải mảng, set về mảng rỗng để tránh crash");
        setUsers([]);
      }

    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        handleForceLogout();
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to load users list');
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

    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [handleForceLogout, fetchUsers]);

  // 🔥 XỬ LÝ SUBMIT FORM TẠO USER (UC-78)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');

    try {
      const response = await apiClient.post('/admin/users', formData);
      if (response.data?.success) {
        alert('Tạo tài khoản người dùng mới thành công!');
        setIsModalOpen(false); // Đóng drawer
        setFormData({ email: '', password: '', role: 'customer', status: 'active' }); // Reset form dữ liệu sạch
        fetchUsers(); // Tải lại danh sách để cập nhật tài khoản mới lên bảng
      }
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        handleForceLogout();
        return;
      }
      setFormError(err?.response?.data?.message || 'Lỗi hệ thống khi tiến hành tạo người dùng.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 🔍 Logic lọc dữ liệu thời gian thực (Real-time Frontend Filtering)
  const filteredUsers = users.filter(userItem => {
    const matchesSearch = userItem.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || userItem.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!user) return null;

  return (
    <div className="w-full space-y-6 relative overflow-hidden">
      {/* Tiêu đề & Đếm tổng số lượng thành viên */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0">Users Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Đang khớp bộ lọc: <strong className="text-emerald-600">{filteredUsers.length}</strong> / Tổng số: <strong>{users.length}</strong> thành viên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchUsers} 
            disabled={loading}
            className="flex items-center px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          
          {/* Nút trigger mở Form Tạo User (UC-78) */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm border-none cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
          </button>
        </div>
      </div>

      {/* Thanh Tìm kiếm & Bộ lọc nâng cao */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="nutritionist">Nutritionist</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Bảng HTML dữ liệu thuần */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">User Account</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Health Goal</th>
                <th className="px-6 py-4">Metrics (BMI/TDEE)</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading database...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-base text-slate-700 m-0">No users found</p>
                    <p className="text-xs m-0 mt-1">There are no user accounts matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => {
                  let roleClass = 'bg-slate-100 text-slate-700';
                  if (userItem.role === 'admin') roleClass = 'bg-red-50 text-red-700 border border-red-100';
                  if (userItem.role === 'nutritionist') roleClass = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (userItem.role === 'customer') roleClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';

                  return (
                    <tr key={userItem.id || userItem._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Users className="w-4 h-4 text-slate-500" />
                          </div>
                          <span className="font-semibold text-slate-800">{userItem.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold capitalize border ${roleClass}`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${userItem.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {userItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {userItem.profile?.healthGoal || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {userItem.profile?.bmi ? (
                          <div className="flex flex-col text-xs text-slate-500">
                            <span>BMI: <strong className="text-slate-700">{userItem.profile.bmi}</strong></span>
                            <span>TDEE: <strong className="text-emerald-600">{userItem.profile.tdee} kcal</strong></span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">No profile data</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 🔥 SLIDE-OVER DRAWER (UC-78: CREATE USER FORM) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Background overlay làm mờ */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !submitLoading && setIsModalOpen(false)}
          />

          {/* Form Panel Trượt Cánh Phải */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 style={{ animation: 'slideIn 0.2s ease-out forwards' }}">
            
            {/* Header Form Drawer */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 m-0 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" /> Create New User Account
                </h3>
                <p className="text-slate-500 text-xs mt-1">Cấp tài khoản hệ thống cho Quản trị viên, Chuyên gia hoặc Khách hàng.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={submitLoading}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 bg-transparent border-none cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields Dữ Liệu */}
            <form onSubmit={handleCreateUser} className="flex-1 p-6 space-y-5 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@wealthyeater.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Password
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to use system default"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 italic m-0">
                  Hệ thống tự động sử dụng mật khẩu cấu hình mặc định nếu để trống (tối thiểu 6 ký tự).
                </p>
              </div>

              {/* Role Select Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> System Role (Quyền hạn)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['customer', 'nutritionist', 'admin'].map((roleOpt) => (
                    <button
                      key={roleOpt}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: roleOpt })}
                      className={`py-2 text-xs font-bold rounded-lg border capitalize cursor-pointer transition-all ${
                        formData.role === roleOpt
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {roleOpt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">Active (Kích hoạt ngay)</option>
                  <option value="suspended">Suspended (Tạm khóa đăng nhập)</option>
                </select>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                onClick={handleCreateUser}
                className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 text-white border-none rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-60 transition-colors"
              >
                {submitLoading ? 'Creating...' : 'Confirm Create'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
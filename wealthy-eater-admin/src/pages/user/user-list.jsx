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
  Trash2,      
  ShieldAlert,
  Edit2 
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
  const [totalUsers, setTotalUsers] = useState(0); // 👈 TỔNG SỐ USER TỪ BACKEND META
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [formData, setFormData] = useState({ email: '', password: '', role: 'customer', status: 'active' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleForceLogout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Truyền limit lớn hoặc lấy theo pagination
      const response = await apiClient.get('/admin/users', {
        params: { limit: 100 } // Tăng limit nếu muốn hiển thị nhiều hơn trên 1 trang
      });

      if (response.data?.success) {
        setUsers(response.data.data || []);
        // 👈 LẤY CHÍNH XÁC TỔNG SỐ TỪ META
        setTotalUsers(response.data.meta?.total || response.data.data?.length || 0);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Session expired. Please log in again!');
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
    fetchUsers();
  }, [handleForceLogout, fetchUsers]);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({ email: '', password: '', role: 'customer', status: 'active' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (userItem) => {
    const currentId = userItem._id || userItem.id;
    setEditingUserId(currentId);
    setFormData({
      email: userItem.email || '',
      password: '', 
      role: userItem.role?.toLowerCase() || 'customer',
      status: userItem.status?.toLowerCase() || 'active'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');
    try {
      if (editingUserId) {
        const response = await apiClient.put(`/admin/users/${editingUserId}`, formData);
        if (response.data?.success) {
          alert('User updated successfully!');
          setIsModalOpen(false);
          await fetchUsers();
        }
      } else {
        const response = await apiClient.post('/admin/users', formData);
        if (response.data?.success) {
          alert('User created successfully!');
          setIsModalOpen(false);
          await fetchUsers();
        }
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || 'An error occurred while processing data.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!userId) return;
    const nextStatus = currentStatus === 'active' ? 'banned' : 'active';
    if (nextStatus === 'banned' && !window.confirm('Ban this account? The user will be logged out immediately!')) return;

    setActionLoadingId(userId);
    try {
      const response = await apiClient.put(`/admin/users/${userId}/status`, { status: nextStatus });
      if (response.data?.success) {
        alert(response.data.message || 'Status updated successfully!');
        await fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error while updating status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!userId) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE account [ ${email} ] from Database?`)) return;

    setActionLoadingId(userId);
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      if (response.data?.success) {
        alert(response.data.message || 'User deleted successfully!');
        await fetchUsers(); 
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Server error while deleting user.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter(userItem => {
    const matchesSearch = userItem.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === '' || userItem.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!user) return null;

  return (
    <div className="w-full space-y-6 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0">Users Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Matching filter: <strong className="text-emerald-600">{filteredUsers.length}</strong> / Total: <strong>{totalUsers}</strong> users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} disabled={loading} className="flex items-center px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button onClick={handleOpenCreateModal} className="flex items-center px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm border-none cursor-pointer">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input type="text" placeholder="Search by email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500">
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
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading database...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <SearchX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-base text-slate-700 m-0">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => {
                  const currentId = userItem._id || userItem.id;
                  const isActionLoading = actionLoadingId === currentId;

                  let roleClass = 'bg-slate-100 text-slate-700';
                  if (userItem.role === 'admin') roleClass = 'bg-red-50 text-red-700 border border-red-100';
                  if (userItem.role === 'nutritionist') roleClass = 'bg-amber-50 text-amber-700 border border-amber-100';
                  if (userItem.role === 'customer') roleClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';

                  return (
                    <tr key={String(currentId)} className="hover:bg-slate-50/50 transition-colors">
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
                        {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString('en-US') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleOpenEditModal(userItem)}
                            className="p-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleToggleStatus(currentId, userItem.status)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer bg-white ${
                              userItem.status === 'active' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title="Toggle Status (Active/Banned)"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleDeleteUser(currentId, userItem.email)}
                            className="p-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => !submitLoading && setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 m-0 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" /> 
                {editingUserId ? 'Edit Existing User' : 'Create New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} disabled={submitLoading} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-transparent border-none cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form id="userForm" onSubmit={handleFormSubmit} className="flex-1 p-6 space-y-5 overflow-y-auto">
              {formError && <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">{formError}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
                <input type="email" required placeholder="name@wealthyeater.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <input type="password" placeholder={editingUserId ? "Leave blank to keep current password" : "Leave blank to use default password"} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">System Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['customer', 'nutritionist', 'admin'].map((roleOpt) => (
                    <button key={roleOpt} type="button" onClick={() => setFormData({ ...formData, role: roleOpt })} className={`py-2 text-xs font-bold rounded-lg border capitalize cursor-pointer transition-all ${formData.role === roleOpt ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>{roleOpt}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
              <button type="button" disabled={submitLoading} onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-sm font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg cursor-pointer">Cancel</button>
              <button form="userForm" type="submit" disabled={submitLoading} className="flex-1 py-2.5 text-sm font-semibold bg-emerald-600 text-white border-none rounded-lg cursor-pointer">
                {submitLoading ? 'Saving...' : editingUserId ? 'Save Changes' : 'Confirm Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { toast } from 'react-hot-toast';
import { Search, MoreHorizontal, Pencil, Trash2, ArchiveRestore, Upload } from 'lucide-react';
import EditRecipePage from './edit-recipes'; 
import { AdminButton } from '../../components/ui/AdminButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { DataTable, DataTableRow, DataTableCell } from '../../components/ui/DataTable';

export default function RecipesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null); // Ref để kích hoạt input file ẩn

  const [user] = useState(() => {
    try {
      const rawUser = localStorage.getItem('admin_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });
  
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false); // State quản lý loading khi import file
  const [error, setError] = useState('');
  const [excelErrors, setExcelErrors] = useState([]); // State lưu danh sách log lỗi của file Excel

  // 🔍 UC-75: Các State Bộ Lọc Nâng Cao
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');       // Xu hướng ăn kiêng
  const [timeRange, setTimeRange] = useState('');         // Khoảng thời gian nấu
  const [calorieRange, setCalorieRange] = useState('');   // Khoảng calo định lượng

  // State quản lý ẩn hiện Modal Edit
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  const handleForceLogout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }, [navigate]);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError('');
    setExcelErrors([]);
    try {
      // Cập nhật: Truyền tham số limit lớn để admin có thể tải và xem toàn bộ danh sách món ăn trên 1 trang
      const response = await apiClient.get('/admin/recipes?limit=5000');
      if (response.data?.success) {
        setRecipes(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching recipes:', err);
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Session expired, please login again!');
        handleForceLogout();
        return;
      }
      setError(err?.response?.data?.message || err.message || 'Failed to load recipes database');
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

    try {
      JSON.parse(rawUser); 
      const timeoutId = setTimeout(() => {
        fetchRecipes(); 
      }, 0);
      return () => clearTimeout(timeoutId);
    } catch {
      handleForceLogout();
    }
  }, [handleForceLogout, fetchRecipes]);

  // 🛠️ UC-76: Hàm xử lý tải và đẩy File Excel lên Server
  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset log lỗi cũ
    setError('');
    setExcelErrors([]);
    setImporting(true);

    const formData = new FormData();
    formData.append('file', file); // 'file' trùng với name cấu hình ở middleware upload phía backend

    try {
      const res = await apiClient.post('/admin/recipes/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast.success(`Imported successfully! Total ${res.data.data?.totalImported || 0} recipes.`, {
          duration: 5000,
          style: { background: '#16a34a', color: '#fff', borderRadius: '12px' }
        });
        fetchRecipes(); // Refresh lại danh sách database
      }
    } catch (err) {
      console.error('❌ Excel Import Error:', err);
      const serverMessage = err.response?.data?.message || 'Failed to import Excel data.';
      setError(serverMessage);

      // Bóc tách mảng errorLog
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setExcelErrors(err.response.data.errors);
      } else if (err.response?.data?.errorLog && Array.isArray(err.response.data.errorLog)) {
        setExcelErrors(err.response.data.errorLog);
      }
      
      toast.error('Import failed! Check error details section.', { duration: 5000 });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input file để có thể chọn lại cùng file cũ
    }
  }

  // 🗑️ Hàm Lưu trữ (Archive) công thức
  async function handleDelete(recipeId) {
    if (!window.confirm('Are you sure you want to archive this recipe?')) return;
    try {
      const res = await apiClient.delete(`/admin/recipes/${recipeId}`);
      if (res.data?.success) {
        toast.success('Recipe moved to archived status successfully!', {
          duration: 4000,
          icon: '🗑️',
          style: { background: '#16a34a', color: '#fff', borderRadius: '12px' }
        });
        fetchRecipes(); 
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete recipe';
      toast.error(errorMsg, { duration: 4000, style: { background: '#dc2626', color: '#fff' } });
    }
  }

  // 🔄 Hàm KHÔI PHỤC công thức từ trạng thái "Archived" về "Draft"
  async function handleRestore(recipeId) {
    if (!window.confirm('Do you want to restore this archived recipe?')) return;
    try {
      const res = await apiClient.put(`/admin/recipes/${recipeId}`, { status: 'draft' });
      if (res.data?.success) {
        toast.success('Recipe restored successfully! Status reset to Draft.', {
          duration: 5000,
          icon: '🔄',
          style: {
            background: '#2563eb',
            color: '#ffffff',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '12px',
            minWidth: '360px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
          },
        });
        fetchRecipes();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to restore recipe';
      toast.error(errorMsg, { duration: 4000, style: { background: '#dc2626', color: '#fff' } });
    }
  }

  // 🔍 UC-75: Logic Real-time Frontend Filtering Nâng Cao
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === '' || recipe.levelCooking === levelFilter;
    const matchesStatus = statusFilter === '' || recipe.status === statusFilter;
    
    const matchesDiet = dietFilter === '' || 
                         (recipe.dietaryTrend?.toLowerCase() === dietFilter.toLowerCase()) ||
                         (recipe.description?.toLowerCase().includes(dietFilter.toLowerCase()));

    let matchesTime = true;
    const time = Number(recipe.cookingTime) || 0;
    if (timeRange === 'short') matchesTime = time < 15;
    else if (timeRange === 'medium') matchesTime = time >= 15 && time <= 30;
    else if (timeRange === 'long') matchesTime = time > 30;

    let matchesCalorie = true;
    const calories = Number(recipe.nutrition?.calories) || 0;
    if (calorieRange === 'low') matchesCalorie = calories < 200;
    else if (calorieRange === 'mid') matchesCalorie = calories >= 200 && calories <= 500;
    else if (calorieRange === 'high') matchesCalorie = calories > 500;

    return matchesSearch && matchesLevel && matchesStatus && matchesDiet && matchesTime && matchesCalorie;
  });

  if (!user) return null;

  return (
    <>
      {/* Input Excel Ẩn điều khiển bằng Ref */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportExcel} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0">Recipes Database</h1>
          <p className="text-slate-500 mt-1">Manage and maintain all culinary recipe database entries</p>
        </div>
        <div className="flex gap-3">
          {/* Nút Import Excel Mới */}
          <AdminButton 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            isLoading={importing}
            className="flex items-center gap-2 border-slate-300 hover:bg-slate-50"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            Import Excel
          </AdminButton>

          <AdminButton onClick={() => navigate('/recipes/add')}>
            + Add New Recipe
          </AdminButton>
          
          <AdminButton onClick={fetchRecipes} variant="outline" isLoading={loading}>
            Refresh Data
          </AdminButton>
        </div>
      </div>

      {/* Hiển thị Thông Báo Lỗi Chung Hệ Thống */}
      {error && (
        <div className="flex flex-col p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="font-semibold">{error}</span>
          </div>
          
          {/* 🛠️ BỘ LOG LỖI EXCEL: Liệt kê chi tiết từng dòng sai để Admin theo dõi */}
          {excelErrors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-200/60 max-h-[220px] overflow-y-auto custom-scrollbar">
              <p className="text-xs font-bold uppercase tracking-wider text-red-800 mb-1.5">Chi tiết lỗi dòng dữ liệu:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-red-600 font-mono">
                {excelErrors.map((errLog, index) => (
                  <li key={index}>{errLog}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 🔍 UC-75: BỘ LỌC TÌM KIẾM NÂNG CAO - ADVANCED FILTER BAR */}
      <section className="flex flex-col gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-sm font-semibold text-slate-800 mb-4">Search & Filters</div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-2 min-w-[240px]">
            <input 
              type="text" 
              placeholder="Search recipe name, keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="">All Statuses (Active)</option>
              <option value="published">Published Only</option>
              <option value="draft">Draft Only</option>
              <option value="archived" className="font-bold text-amber-600">⚠️ Archived</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <select value={dietFilter} onChange={(e) => setDietFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="">Dietary Trend</option>
              <option value="keto">Keto Diet</option>
              <option value="vegan">Vegan</option>
              <option value="low-carb">Low-Carb</option>
              <option value="clean">Eat Clean</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="">Cooking Time</option>
              <option value="short">Quick (&lt; 15 mins)</option>
              <option value="medium">Medium (15-30 mins)</option>
              <option value="long">Elaborate (&gt; 30 mins)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[130px]">
            <select value={calorieRange} onChange={(e) => setCalorieRange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="">Calories Range</option>
              <option value="low">Light (&lt; 200 kcal)</option>
              <option value="mid">Balanced (200-500 kcal)</option>
              <option value="high">High Energy (&gt; 500 kcal)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[110px]">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
              <option value="">Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </section>

      {/* DATATABLE SECTION */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          {loading && recipes.length === 0 ? (
            <LoadingState text="Loading recipes database..." />
          ) : filteredRecipes.length === 0 ? (
            <EmptyState 
              icon={Search} 
              title="No recipes found" 
              description="No recipes available matching the specific filters." 
            />
          ) : (
            <DataTable headers={['Recipe Details', 'Total Calories', 'Level', 'Time', 'Rating', 'Status', 'Actions']}>
              {filteredRecipes.map((recipe) => {
                // 1. Đọc linh hoạt tất cả các tên trường đường dẫn ảnh có thể trả về từ Backend
                const rawImgUrl = recipe.imageUrl || recipe.image || recipe.image_url || recipe.photo || recipe.avatar;

                // 2. Tối ưu Cache-Busting: dùng timestamp từ updatedAt (nếu có) hoặc fallback để force load lại ảnh mới khi đè file
                const cacheKey = recipe.updatedAt ? new Date(recipe.updatedAt).getTime() : Date.now();
                const freshImgUrl = rawImgUrl 
                  ? `${rawImgUrl}${rawImgUrl.includes('?') ? '&' : '?'}v=${cacheKey}`
                  : null;

                return (
                  <DataTableRow 
                    key={recipe.id || recipe._id} 
                    className={recipe.status === 'archived' ? 'opacity-65 bg-slate-50' : ''}
                  >
                    <DataTableCell>
                      <div className="flex items-center gap-4">
                        {freshImgUrl ? (
                          <img 
                            key={freshImgUrl} // Key động giúp React rerender lại thẻ img khi URL thay đổi
                            className="w-12 h-12 rounded-lg object-cover bg-slate-100" 
                            src={freshImgUrl} 
                            alt={recipe.name}
                            onError={(e) => {
                              // Tự động ẩn ảnh bị hỏng và chuyển sang hiển thị icon fallback
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              if (e.target.nextElementSibling) {
                                e.target.nextElementSibling.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        
                        {/* Fallback khi không có URL hoặc khi tải ảnh bị lỗi */}
                        <div className={`w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xl shrink-0 ${freshImgUrl ? 'hidden' : ''}`}>
                          🍳
                        </div>

                        <div className="text-left">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {recipe.name} 
                            {recipe.status === 'archived' && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Archived</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1">{recipe.description || 'No description provided'}</div>
                        </div>
                      </div>
                    </DataTableCell>
                    
                    <DataTableCell>
                      <div className="font-bold text-primary">
                        {recipe.nutrition?.calories || 0} kcal
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex gap-2 font-medium">
                        <span>C: {recipe.nutrition?.carbs || 0}g</span>
                        <span>P: {recipe.nutrition?.protein || 0}g</span>
                        <span>F: {recipe.nutrition?.fat || 0}g</span>
                      </div>
                    </DataTableCell>

                    <DataTableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        recipe.levelCooking === 'easy' ? 'bg-primary/15 text-primary' :
                        recipe.levelCooking === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {recipe.levelCooking ? recipe.levelCooking.charAt(0).toUpperCase() + recipe.levelCooking.slice(1) : '—'}
                      </span>
                    </DataTableCell>
                    
                    <DataTableCell>
                      <span className="font-medium text-slate-700">{recipe.cookingTime} mins</span>
                    </DataTableCell>
                    
                    <DataTableCell>
                      <div className="flex items-center gap-1 font-semibold text-amber-500">
                        <span>{recipe.reviewStats?.averageRating || '—'}</span>
                        {recipe.reviewStats?.averageRating > 0 && <span>★</span>}
                      </div>
                    </DataTableCell>
                    
                    <DataTableCell>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        recipe.status === 'published' ? 'bg-primary/15 text-primary' :
                        recipe.status === 'archived' ? 'bg-slate-200 text-slate-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {recipe.status ? recipe.status.charAt(0).toUpperCase() + recipe.status.slice(1) : '—'}
                      </span>
                    </DataTableCell>
                    
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Details"
                          onClick={() => navigate(`/recipes/${recipe.id || recipe._id}`)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        <button
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Recipe"
                          onClick={() => setEditingRecipeId(recipe.id || recipe._id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {recipe.status === 'archived' ? (
                          <button
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore Recipe"
                            onClick={() => handleRestore(recipe.id || recipe._id)}
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive Recipe"
                            onClick={() => handleDelete(recipe.id || recipe._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTable>
          )}
        </div>
      </section>

      {/* MODAL OVERLAY CHỈNH SỬA CÔNG THỨC */}
      {editingRecipeId && (
        <EditRecipePage 
          id={editingRecipeId} 
          onClose={() => setEditingRecipeId(null)} 
          onRefresh={fetchRecipes} 
        />
      )}
    </>
  );
}
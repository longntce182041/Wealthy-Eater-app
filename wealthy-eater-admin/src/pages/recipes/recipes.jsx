import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { toast } from 'react-hot-toast';
import { Search, MoreHorizontal, Pencil, Trash2, ArchiveRestore } from 'lucide-react';
import EditRecipePage from './edit-recipes'; 
import { AdminButton } from '../../components/ui/AdminButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { DataTable, DataTableRow, DataTableCell } from '../../components/ui/DataTable';

export default function RecipesPage() {
  const navigate = useNavigate();
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
  const [error, setError] = useState('');
  
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
    try {
      const response = await apiClient.get('/admin/recipes');
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
      // Defer execution to avoid "synchronous setState in effect" strict linter warning
      const timeoutId = setTimeout(() => {
        fetchRecipes(); 
      }, 0);
      return () => clearTimeout(timeoutId);
    } catch {
      handleForceLogout();
    }
  }, [handleForceLogout, fetchRecipes]);

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
      // Gửi request PUT/PATCH cập nhật lại status thành draft (hoặc tùy API của bác)
      const res = await apiClient.put(`/admin/recipes/${recipeId}`, { status: 'draft' });
      if (res.data?.success) {
        toast.success('Recipe restored successfully! Status reset to Draft.', {
          duration: 5000,
          icon: '🔄',
          style: {
            background: '#2563eb', // Màu xanh dương của sự khôi phục hiện đại
            color: '#ffffff',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '12px',
            minWidth: '360px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
          },
        });
        fetchRecipes(); // Tải lại danh sách
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to restore recipe';
      toast.error(errorMsg, { duration: 4000, style: { background: '#dc2626', color: '#fff' } });
    }
  }

  // 🔍 UC-75: Logic Real-time Frontend Filtering Nâng Cao
  const filteredRecipes = recipes.filter(recipe => {
    // 1. Tìm kiếm chuỗi văn bản
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Lọc theo độ khó & Trạng thái
    const matchesLevel = levelFilter === '' || recipe.levelCooking === levelFilter;
    const matchesStatus = statusFilter === '' || recipe.status === statusFilter;
    
    // 3. Lọc theo xu hướng ăn kiêng (Giả định trường dữ liệu diet hoặc categories trong DB)
    const matchesDiet = dietFilter === '' || 
                         (recipe.dietaryTrend?.toLowerCase() === dietFilter.toLowerCase()) ||
                         (recipe.description?.toLowerCase().includes(dietFilter.toLowerCase()));

    // 4. Lọc theo khoảng thời gian nấu
    let matchesTime = true;
    const time = Number(recipe.cookingTime) || 0;
    if (timeRange === 'short') matchesTime = time < 15;
    else if (timeRange === 'medium') matchesTime = time >= 15 && time <= 30;
    else if (timeRange === 'long') matchesTime = time > 30;

    // 5. Lọc theo khoảng Calo định lượng
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight m-0">Recipes Database</h1>
          <p className="text-slate-500 mt-1">Manage and maintain all culinary recipe database entries</p>
        </div>
        <div className="flex gap-3">
          <AdminButton onClick={() => navigate('/recipes/add')}>
            + Add New Recipe
          </AdminButton>
          <AdminButton onClick={fetchRecipes} variant="outline" isLoading={loading}>
            Refresh Data
          </AdminButton>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="font-medium">{error}</span>
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
              {filteredRecipes.map((recipe) => (
                <DataTableRow 
                  key={recipe.id || recipe._id} 
                  className={recipe.status === 'archived' ? 'opacity-65 bg-slate-50' : ''}
                >
                  <DataTableCell>
                    <div className="flex items-center gap-4">
                      {recipe.imageUrl ? (
                        <img className="w-12 h-12 rounded-lg object-cover" src={recipe.imageUrl} alt={recipe.name} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-xl">🍳</div>
                      )}
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
              ))}
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
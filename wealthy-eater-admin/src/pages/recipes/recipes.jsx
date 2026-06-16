import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import '../dashboard.css';
import { toast } from 'react-hot-toast';
import EditRecipePage from './edit-recipes'; 

export default function RecipesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const rawUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_session_jwt_token');

    if (!rawUser || !token) {
      handleForceLogout();
      return;
    }

    try {
      setUser(JSON.parse(rawUser));
      fetchRecipes(); 
    } catch (e) {
      handleForceLogout();
    }
  }, [navigate]);

  function handleForceLogout() {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }

  async function fetchRecipes() {
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
      {error && (
        <div className="error-banner" style={{ marginBottom: '30px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 🔍 UC-75: BỘ LỌC TÌM KIẾM NÂNG CAO - ADVANCED FILTER BAR */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
        <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Search & Filters</div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Tìm văn bản */}
          <div style={{ flex: 2, minWidth: '240px' }}>
            <input 
              type="text" 
              placeholder="Search recipe name, keywords..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          {/* Lọc Trạng thái (Quan trọng để tìm kiếm 'Archived') */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterSelectStyle}>
              <option value="">All Statuses (Active)</option>
              <option value="published">Published Only</option>
              <option value="draft">Draft Only</option>
              <option value="archived" style={{ color: '#fb923c', fontWeight: 'bold' }}>⚠️ Archived (Deleted)</option>
            </select>
          </div>

          {/* Lọc Ăn Kiêng */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <select value={dietFilter} onChange={(e) => setDietFilter(e.target.value)} style={filterSelectStyle}>
              <option value="">Dietary Trend</option>
              <option value="keto">Keto Diet</option>
              <option value="vegan">Vegan (Chay)</option>
              <option value="low-carb">Low-Carb</option>
              <option value="clean">Eat Clean</option>
            </select>
          </div>

          {/* Lọc Thời gian nấu */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={filterSelectStyle}>
              <option value="">Cooking Time</option>
              <option value="short">Quick (&lt; 15 mins)</option>
              <option value="medium">Medium (15-30 mins)</option>
              <option value="long">Elaborate (&gt; 30 mins)</option>
            </select>
          </div>

          {/* Lọc Năng lượng Calo */}
          <div style={{ flex: 1, minWidth: '130px' }}>
            <select value={calorieRange} onChange={(e) => setCalorieRange(e.target.value)} style={filterSelectStyle}>
              <option value="">Calories Range</option>
              <option value="low">Light (&lt; 200 kcal)</option>
              <option value="mid">Balanced (200-500 kcal)</option>
              <option value="high">High Energy (&gt; 500 kcal)</option>
            </select>
          </div>

          {/* Lọc Độ khó */}
          <div style={{ flex: 1, minWidth: '110px' }}>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={filterSelectStyle}>
              <option value="">Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </section>

      {/* DATATABLE SECTION */}
      <section className="table-card">
        <div className="table-header">
          <div>
            <h3>Recipes Database Management</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>Manage and maintain all culinary recipe database entries across the platform</p>
          </div>
          <div className="table-actions">
            <button className="btn-primary" style={{ background: '#2563eb' }} onClick={() => navigate('/recipes/add')}>
                <span>+ Add New Recipe</span>
            </button>
            <button className="btn-primary" onClick={fetchRecipes}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        <div className="data-table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>Loading recipes database...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <p>No recipes available matching the specific filters.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipe Details</th>
                  <th>Total Calories</th>
                  <th>Level</th>
                  <th>Time</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe) => (
                  <tr key={recipe.id || recipe._id} style={recipe.status === 'archived' ? { opacity: 0.65, background: '#1e293b44' } : {}}>
                    <td>
                      <div className="recipe-cell">
                        {recipe.imageUrl ? (
                          <img className="recipe-img" src={recipe.imageUrl} alt={recipe.name} />
                        ) : (
                          <div className="recipe-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#9ca3af' }}>🍳</div>
                        )}
                        <div style={{ textAlign: 'left' }}>
                          <div className="recipe-title">
                            {recipe.name} {recipe.status === 'archived' && <span style={{ fontSize: '11px', background: '#7c2d12', color: '#fdba74', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Archived</span>}
                          </div>
                          <div className="recipe-desc">{recipe.description || 'No description provided'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '800', color: '#38bdf8', fontSize: '15px' }}>
                          {recipe.nutrition?.calories || 0} kcal
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '6px' }}>
                          <span>C: {recipe.nutrition?.carbs || 0}g</span>
                          <span>P: {recipe.nutrition?.protein || 0}g</span>
                          <span>F: {recipe.nutrition?.fat || 0}g</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${recipe.levelCooking}`}>
                        {recipe.levelCooking ? recipe.levelCooking.charAt(0).toUpperCase() + recipe.levelCooking.slice(1) : '—'}
                      </span>
                    </td>
                    
                    <td>
                      <span style={{ fontWeight: 500 }}>{recipe.cookingTime} mins</span>
                    </td>
                    
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#f59e0b' }}>
                        <span>{recipe.reviewStats?.averageRating || '—'}</span>
                        {recipe.reviewStats?.averageRating > 0 && <span>★</span>}
                      </div>
                    </td>
                    
                    <td>
                      <span className={`badge ${recipe.status}`}>
                        {recipe.status ? recipe.status.charAt(0).toUpperCase() + recipe.status.slice(1) : '—'}
                      </span>
                    </td>
                    
                    <td>
                      <div className="actions-cell">
                        {/* 👁️ NÚT XEM CHI TIẾT */}
                        <button
                          className="btn-icon-action"
                          title="View Details"
                          onClick={() => navigate(`/recipes/${recipe.id || recipe._id}`)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                            <circle cx="5" cy="12" r="1"></circle>
                          </svg>
                        </button>

                        {/* ✏️ NÚT CHỈNH SỬA */}
                        <button
                          className="btn-icon-action"
                          title="Edit Recipe"
                          onClick={() => setEditingRecipeId(recipe.id || recipe._id)}
                          style={{ color: '#38bdf8' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>

                        {/* 🔄 NÚT KHÔI PHỤC HOẶC 🗑️ NÚT XÓA DỰA VÀO STATUS */}
                        {recipe.status === 'archived' ? (
                          /* NÚT KHÔI PHỤC (Chỉ xuất hiện khi trạng thái là archived) */
                          <button
                            className="btn-icon-action"
                            title="Restore Recipe"
                            onClick={() => handleRestore(recipe.id || recipe._id)}
                            style={{ color: '#22c55e' }} /* Màu xanh lá/dương khôi phục */
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10"></polyline>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                          </button>
                        ) : (
                          /* NÚT XÓA / LƯU TRỮ (Dành cho các công thức bình thường) */
                          <button
                            className="btn-icon-action delete"
                            title="Archive Recipe"
                            onClick={() => handleDelete(recipe.id || recipe._id)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

// 🎨 Styles phụ trợ cho bộ lọc mới đồng bộ Dashboard Darkmode
const filterInputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px', 
  background: '#0f172a', border: '1px solid #334155', color: '#fff',
  boxSizing: 'border-box', fontSize: '13px', outline: 'none'
};

const filterSelectStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '8px', 
  background: '#0f172a', border: '1px solid #334155', color: '#fff',
  cursor: 'pointer', fontSize: '13px', outline: 'none'
};
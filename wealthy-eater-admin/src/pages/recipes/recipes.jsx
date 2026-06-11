import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import '../dashboard.css';
import { toast } from 'react-hot-toast';

export default function RecipesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters for Admin operations
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // Security check
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

  async function handleDelete(recipeId) {
  if (!window.confirm('Are you sure you want to archive/delete this recipe?')) return;
  try {
    const res = await apiClient.delete(`/admin/recipes/${recipeId}`);
    if (res.data?.success) {
      
      // 🚀 Đã chỉnh sửa: Popup Xóa màu xanh lá cây, kích thước lớn và tự ẩn sau 5 giây
      toast.success('Recipe archived successfully!', {
        duration: 5000,
        icon: '🗑️', // Giữ icon thùng rác cho trực quan hành động xóa
        style: {
          background: '#16a34a', // Màu xanh lá cây chuẩn (Tailwind green-600)
          color: '#ffffff',      // Chữ màu trắng
          padding: '16px 24px',  // Tăng padding giúp popup to và béo hơn
          fontSize: '16px',      // Chữ to rõ ràng
          fontWeight: '500',     // Chữ đậm vừa phải thanh lịch
          borderRadius: '12px',  // Bo góc hiện đại đồng bộ
          minWidth: '360px',     // Chiều rộng bề thế, không lo bị co chữ
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)' // Đổ bóng sâu nổi bật
        },
      });
      
      fetchRecipes(); 
    }
  } catch (err) {
    if (err.response?.status === 401) {
      handleForceLogout();
      return;
    }
    
    const errorMsg = err.response?.data?.message || err.message || 'Failed to delete recipe';
    
    // ❌ Popup thông báo lỗi (Làm to tương đương nhưng dùng màu đỏ hệ thống để cảnh báo)
    toast.error(errorMsg, {
      duration: 5000,
      style: {
        background: '#dc2626', // Màu đỏ chuẩn hệ thống
        color: '#ffffff',
        padding: '16px 24px',
        fontSize: '16px',
        borderRadius: '12px',
        minWidth: '360px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
      }
    });
  }
}

  // Real-time frontend filtering
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === '' || recipe.levelCooking === levelFilter;
    const matchesStatus = statusFilter === '' || recipe.status === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
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

      {/* FILTER & SEARCH BAR */}
      <section style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <input 
            type="text" 
            placeholder="Search recipe name, description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px', 
              background: '#1e293b', border: '1px solid #334155', color: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <select 
          value={levelFilter} 
          onChange={(e) => setLevelFilter(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: '10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', cursor: 'pointer' }}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: '10px', background: '#1e293b', border: '1px solid #334155', color: '#fff', cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
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
              <p>No recipes available matching the filters.</p>
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
                  <tr key={recipe.id || recipe._id}>
                    <td>
                      <div className="recipe-cell">
                        {recipe.imageUrl ? (
                          <img className="recipe-img" src={recipe.imageUrl} alt={recipe.name} />
                        ) : (
                          <div className="recipe-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155', color: '#9ca3af' }}>🍳</div>
                        )}
                        <div style={{ textAlign: 'left' }}>
                          <div className="recipe-title">{recipe.name}</div>
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
                        {recipe.status !== 'archived' && (
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
    </>
  );
}
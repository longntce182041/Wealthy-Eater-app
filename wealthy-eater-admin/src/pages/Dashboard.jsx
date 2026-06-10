import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import './dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalRecipes: 0,
    publishedRecipes: 0,
    draftRecipes: 0,
    totalReviews: 0,
    averageRating: 0,
    topRecipe: null
  });
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('admin_user');
    if (!raw) {
      navigate('/login');
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch (e) {
      localStorage.removeItem('admin_user');
      navigate('/login');
      return;
    }

    fetchData();
  }, [navigate]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, recipesRes] = await Promise.all([
        apiClient.get('/admin/recipes/stats'),
        apiClient.get('/admin/recipes')
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (recipesRes.data?.success) {
        setRecipes(recipesRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(recipeId) {
    if (!window.confirm('Are you sure you want to archive/delete this recipe?')) return;
    try {
      const res = await apiClient.delete(`/admin/recipes/${recipeId}`);
      if (res.data?.success) {
        alert('Recipe soft-deleted successfully!');
        fetchData(); 
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete recipe');
    }
  }

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

      {/* Metric Cards Grid */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h4>Total Recipes</h4>
            <p>{loading ? '...' : stats.totalRecipes}</p>
          </div>
          <div className="metric-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Published</h4>
            <p>{loading ? '...' : stats.publishedRecipes}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Drafts</h4>
            <p>{loading ? '...' : stats.draftRecipes}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h4>Average Rating</h4>
            <p>{loading ? '...' : `${stats.averageRating} ★`}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
        </div>
      </section>

      {/* Recipes Table Card */}
      <section className="table-card">
        <div className="table-header">
          <h3>Recipes List</h3>
          <div className="table-actions">
            <button className="btn-primary" onClick={fetchData}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        <div className="data-table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', fontWeight: 600 }}>Loading recipes database...</div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <p>No recipes available in the database.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Recipe Details</th>
                  <th>Level</th>
                  <th>Time (Mins)</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr key={recipe.id}>
                    <td>
                      <div className="recipe-cell">
                        {recipe.imageUrl ? (
                          <img className="recipe-img" src={recipe.imageUrl} alt={recipe.name} />
                        ) : (
                          <div className="recipe-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>🍳</div>
                        )}
                        <div style={{ textAlign: 'left' }}>
                          <div className="recipe-title">{recipe.name}</div>
                          <div className="recipe-desc">{recipe.description}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${recipe.levelCooking}`}>
                        {recipe.levelCooking}
                      </span>
                    </td>
                    <td>{recipe.cookingTime} mins</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#f59e0b' }}>
                        <span>{recipe.reviewStats?.averageRating || '—'}</span>
                        {recipe.reviewStats?.averageRating > 0 && <span>★</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${recipe.status}`}>
                        {recipe.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn-icon-action"
                          title="View Details"
                          onClick={() => alert(`Details: \n\nName: ${recipe.name}\nCalories: ${recipe.nutrition?.calories || 0} kcal\nProtein: ${recipe.nutrition?.protein || 0}g\nCarbs: ${recipe.nutrition?.carbs || 0}g\nFat: ${recipe.nutrition?.fat || 0}g\n\nSteps:\n${recipe.cookingStep}`)}
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
                            onClick={() => handleDelete(recipe.id)}
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
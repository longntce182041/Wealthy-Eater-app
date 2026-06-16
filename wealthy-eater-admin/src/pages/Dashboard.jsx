import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { 
  Utensils, 
  CheckCircle, 
  FileEdit, 
  Star, 
  RefreshCw, 
  Inbox, 
  Eye, 
  Trash2,
  AlertCircle
} from 'lucide-react';

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
    const rawUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_session_jwt_token');

    if (!rawUser || !token) {
      handleForceLogout();
      return;
    }

    try {
      setUser(JSON.parse(rawUser));
      fetchData();
    } catch (e) {
      handleForceLogout();
    }
  }, [navigate]);

  function handleForceLogout() {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }

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
      
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        handleForceLogout();
        return;
      }

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
      if (err.response?.status === 401) {
        handleForceLogout();
        return;
      }
      alert(err?.response?.data?.message || err.message || 'Failed to delete recipe');
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-slate-500 text-sm font-medium mb-1">Total Recipes</h4>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.totalRecipes}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Utensils size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-slate-500 text-sm font-medium mb-1">Published</h4>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.publishedRecipes}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-slate-500 text-sm font-medium mb-1">Drafts</h4>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : stats.draftRecipes}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <FileEdit size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-slate-500 text-sm font-medium mb-1">Average Rating</h4>
            <p className="text-2xl font-bold text-slate-900">{loading ? '...' : `${stats.averageRating} ★`}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <Star size={24} />
          </div>
        </div>
      </section>

      {/* Recipes Table Card */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800">Recipes List</h3>
          <button 
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors"
            onClick={fetchData}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center">
              <RefreshCw size={32} className="animate-spin mb-4 opacity-50 text-emerald-500" />
              <div className="font-semibold text-sm">Loading recipes database...</div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <Inbox size={48} className="mb-4 opacity-50" />
              <p className="font-medium text-sm">No recipes available in the database.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Recipe Details</th>
                  <th className="px-6 py-4">Nutrition</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipes.map((recipe) => (
                  <tr key={recipe.id || recipe._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {recipe.image_url || recipe.imageUrl ? (
                          <img className="w-12 h-12 rounded-xl object-cover border border-slate-200" src={recipe.image_url || recipe.imageUrl} alt={recipe.name} />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
                            <Utensils size={20} />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 mb-0.5">{recipe.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{recipe.description}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-blue-600 text-sm mb-1">
                          {recipe.nutrition?.calories || recipe.calories || 0} kcal
                        </div>
                        <div className="text-[11px] text-slate-500 flex gap-2 font-medium">
                          <span>C: {recipe.nutrition?.carbs || recipe.carbs || 0}g</span>
                          <span>P: {recipe.nutrition?.protein || recipe.protein || 0}g</span>
                          <span>F: {recipe.nutrition?.fat || recipe.fat || 0}g</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                        ${recipe.levelCooking === 'easy' ? 'bg-emerald-100 text-emerald-700' : 
                          recipe.levelCooking === 'medium' ? 'bg-amber-100 text-amber-700' : 
                          'bg-red-100 text-red-700'}`}
                      >
                        {recipe.levelCooking}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                      {recipe.cookingTime} mins
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-semibold text-amber-500 text-sm">
                        <span>{recipe.reviewStats?.averageRating || '—'}</span>
                        {recipe.reviewStats?.averageRating > 0 && <Star size={14} className="fill-current" />}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                        ${recipe.status === 'published' ? 'bg-blue-100 text-blue-700' : 
                          recipe.status === 'draft' ? 'bg-slate-100 text-slate-700' : 
                          'bg-slate-100 text-slate-600'}`}
                      >
                        {recipe.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Details"
                          onClick={() => alert(`Details: \n\nName: ${recipe.name}\nCalories: ${recipe.nutrition?.calories || 0} kcal\nProtein: ${recipe.nutrition?.protein || 0}g\nCarbs: ${recipe.nutrition?.carbs || 0}g\nFat: ${recipe.nutrition?.fat || 0}g\n\nSteps:\n${recipe.cookingStep}`)}
                        >
                          <Eye size={18} />
                        </button>
                        {recipe.status !== 'archived' && (
                          <button
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Archive Recipe"
                            onClick={() => handleDelete(recipe.id || recipe._id)}
                          >
                            <Trash2 size={18} />
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
    </div>
  );
}
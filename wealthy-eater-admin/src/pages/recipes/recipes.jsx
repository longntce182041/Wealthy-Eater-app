import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { Search, Filter, RefreshCw, Eye, Trash2 } from 'lucide-react';

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
  
  // Filters for Admin operations
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
    // Security check
    const token = localStorage.getItem('admin_session_jwt_token');
    if (!user || !token) {
      handleForceLogout();
      return;
    }
    // Call it after the first render tick to avoid cascading render warnings
    const timer = setTimeout(() => {
      fetchRecipes(); 
    }, 0);
    return () => clearTimeout(timer);
  }, [user, handleForceLogout, fetchRecipes]);

  async function handleDelete(recipeId) {
    if (!window.confirm('Are you sure you want to archive/delete this recipe?')) return;
    try {
      const res = await apiClient.delete(`/admin/recipes/${recipeId}`);
      if (res.data?.success) {
        alert('Recipe archived successfully!');
        fetchRecipes(); 
      }
    } catch (err) {
      if (err.response?.status === 401) {
        handleForceLogout();
        return;
      }
      alert(err?.response?.data?.message || err.message || 'Failed to delete recipe');
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
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200 shadow-sm text-sm font-medium">
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-900">Recipes Management</h2>
        <p className="text-slate-500 text-sm">
          Manage and maintain all culinary recipe database entries across the platform
        </p>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              placeholder="Search recipe name, description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Filter size={16} />
            </div>
            <select 
              className="block w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
              value={levelFilter} 
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Filter size={16} />
            </div>
            <select 
              className="block w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        
        <div className="w-full md:w-auto shrink-0">
          <button 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20" 
            onClick={fetchRecipes}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* DATATABLE SECTION */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-medium text-sm">Loading recipes database...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Search size={24} className="opacity-50" />
              </div>
              <p className="font-medium text-sm">No recipes available matching the filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Recipe Details</th>
                  <th className="px-6 py-4">Total Calories</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecipes.map((recipe) => (
                  <tr key={recipe.id || recipe._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {recipe.image_url || recipe.imageUrl ? (
                          <img 
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" 
                            src={recipe.image_url || recipe.imageUrl} 
                            alt={recipe.name} 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl shrink-0 border border-slate-200 shadow-sm">
                            🍳
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate mb-0.5">{recipe.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{recipe.description || 'No description provided'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-emerald-600 text-sm mb-1">
                          {recipe.nutrition?.calories || 0} kcal
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">C: {recipe.nutrition?.carbs || 0}g</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">P: {recipe.nutrition?.protein || 0}g</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">F: {recipe.nutrition?.fat || 0}g</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${recipe.levelCooking === 'easy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          recipe.levelCooking === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          recipe.levelCooking === 'hard' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-slate-50 text-slate-700 border border-slate-200'}
                      `}>
                        {recipe.levelCooking ? recipe.levelCooking.charAt(0).toUpperCase() + recipe.levelCooking.slice(1) : '—'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700 text-sm">{recipe.cookingTime} mins</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                        <span>{recipe.reviewStats?.averageRating || '—'}</span>
                        {recipe.reviewStats?.averageRating > 0 && <span>★</span>}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${recipe.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          recipe.status === 'draft' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          recipe.status === 'archived' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                          'bg-slate-50 text-slate-700 border border-slate-200'}
                      `}>
                        {recipe.status ? recipe.status.charAt(0).toUpperCase() + recipe.status.slice(1) : '—'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                          title="View Details"
                          onClick={() => navigate(`/admin/recipes/${recipe.id || recipe._id}`)}
                        >
                          <Eye size={18} />
                        </button>
                        {recipe.status !== 'archived' && (
                          <button
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
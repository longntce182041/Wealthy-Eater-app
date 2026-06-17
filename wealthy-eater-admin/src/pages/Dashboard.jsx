import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { StatCard } from '../components/ui/StatCard';
import { DataTable, DataTableRow, DataTableCell } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { AdminButton } from '../components/ui/AdminButton';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  ChefHat, 
  CheckCircle2, 
  FileEdit, 
  Star, 
  RefreshCw, 
  Eye, 
  Trash2, 
  SearchX,
  AlertCircle,
  Users // 🆕 Thêm Icon quản lý thành viên
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const rawUser = localStorage.getItem('admin_user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });
  
  // 🆕 Đồng bộ state thống kê, bổ sung trường totalUsers mặc định
  const [stats, setStats] = useState({
    totalRecipes: 0,
    publishedRecipes: 0,
    draftRecipes: 0,
    totalReviews: 0,
    averageRating: 0,
    totalUsers: 0, // Giá trị khởi tạo
    topRecipe: null
  });
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hàm dọn dẹp bộ nhớ khi không hợp lệ hoặc hết hạn
  const handleForceLogout = useCallback(() => {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session_jwt_token');
    navigate('/login');
  }, [navigate]);

  const fetchData = useCallback(async () => {
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
      
      // NẾU BACKEND BÁO TOKEN HẾT HẠN (401) HOẶC SAI LỖI -> ĐÁ VỀ LOGIN LUÔN
      if (err.response?.status === 401 || err.response?.data?.message?.includes('expired')) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!');
        handleForceLogout();
        return;
      }

      setError(err?.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [handleForceLogout]);

  useEffect(() => {
    // Kiểm tra nghiêm ngặt CẢ Thông tin User và Token bảo mật
    const rawUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_session_jwt_token');

    // Nếu thiếu 1 trong 2, dọn sạch bộ nhớ và đá về trang Login ngay
    if (!rawUser || !token) {
      handleForceLogout();
      return;
    }

    try {
      JSON.parse(rawUser); // validate
      // Defer execution to avoid "synchronous setState in effect" strict linter warning
      const timeoutId = setTimeout(() => {
        fetchData(); // Chỉ gọi API khi xác nhận có đủ cả user và token
      }, 0);
      return () => clearTimeout(timeoutId);
    } catch {
      handleForceLogout();
    }
  }, [handleForceLogout, fetchData]);

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
    <main className="flex-1 w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-h)] m-0">Dashboard</h1>
          <p className="text-[var(--text-muted)] mt-1">Overview of your platform's recipes and metrics.</p>
        </div>
        <AdminButton onClick={fetchData} variant="outline" className="shrink-0">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </AdminButton>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Recipes" 
          value={loading ? '...' : stats.totalRecipes} 
          icon={<ChefHat className="w-5 h-5 text-[var(--text-main)]" />} 
        />
        <StatCard 
          title="Published" 
          value={loading ? '...' : stats.publishedRecipes} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />} 
          iconBg="rgba(16, 185, 129, 0.1)"
        />
        <StatCard 
          title="Drafts" 
          value={loading ? '...' : stats.draftRecipes} 
          icon={<FileEdit className="w-5 h-5 text-amber-600 dark:text-amber-400" />} 
          iconBg="rgba(245, 158, 11, 0.1)"
        />
        {/* 🆕 THẺ THÀNH VIÊN ĐÃ ĐỒNG BỘ: Hiển thị tổng số tài khoản thay cho rating trung bình */}
        <StatCard 
          title="Total Users" 
          value={loading ? '...' : (stats.totalUsers || 0)} 
          icon={<Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />} 
          iconBg="rgba(14, 165, 233, 0.1)"
        />
      </section>

      {/* Recipes Table Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--text-h)] tracking-tight m-0">Recent Recipes</h2>
        </div>

        <DataTable 
          headers={["Recipe", "Nutrition", "Level", "Time", "Rating", "Status", "Actions"]}
          emptyState={
            <tr>
              <td colSpan="7" className="p-0">
                {loading && recipes.length === 0 ? (
                  <LoadingState text="Loading database..." />
                ) : (
                  <EmptyState icon={SearchX} title="No recipes available" description="There are no recent recipes to display." />
                )}
              </td>
            </tr>
          }
        >
          {recipes.length > 0 ? recipes.map((recipe) => {
            const cals = recipe.nutrition?.calories || recipe.calories || 0;
            const carbs = recipe.nutrition?.carbs || recipe.carbs || 0;
            const protein = recipe.nutrition?.protein || recipe.protein || 0;
            const fat = recipe.nutrition?.fat || recipe.fat || 0;
            
            let statusVariant = 'default';
            if (recipe.status === 'published') statusVariant = 'success';
            if (recipe.status === 'draft') statusVariant = 'warning';
            if (recipe.status === 'archived') statusVariant = 'destructive';

            let levelVariant = 'default';
            if (recipe.levelCooking === 'easy') levelVariant = 'success';
            if (recipe.levelCooking === 'medium') levelVariant = 'warning';
            if (recipe.levelCooking === 'hard') levelVariant = 'destructive';

            return (
              <DataTableRow key={recipe.id || recipe._id}>
                <DataTableCell>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-[var(--bg-muted)] border border-[var(--border)] shrink-0 flex items-center justify-center">
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover" />
                      ) : (
                        <ChefHat className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="flex flex-col max-w-[200px]">
                      <span className="font-semibold text-[var(--text-h)] truncate" title={recipe.name}>{recipe.name}</span>
                      <span className="text-xs text-[var(--text-muted)] truncate" title={recipe.description}>{recipe.description}</span>
                    </div>
                  </div>
                </DataTableCell>

                <DataTableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sky-500">{cals} kcal</span>
                    <div className="flex gap-2 text-xs text-[var(--text-muted)] mt-1">
                      <span title="Carbs">C: {carbs}g</span>
                      <span title="Protein">P: {protein}g</span>
                      <span title="Fat">F: {fat}g</span>
                    </div>
                  </div>
                </DataTableCell>

                <DataTableCell>
                  <Badge variant={levelVariant} className="capitalize">{recipe.levelCooking}</Badge>
                </DataTableCell>

                <DataTableCell>
                  <span className="font-medium">{recipe.cookingTime}m</span>
                </DataTableCell>

                <DataTableCell>
                  <div className="flex items-center gap-1 font-semibold text-amber-500">
                    <span>{recipe.reviewStats?.averageRating || '—'}</span>
                    {recipe.reviewStats?.averageRating > 0 && <Star className="w-3.5 h-3.5 fill-current" />}
                  </div>
                </DataTableCell>

                <DataTableCell>
                  <Badge variant={statusVariant} className="capitalize">{recipe.status}</Badge>
                </DataTableCell>

                <DataTableCell>
                  <div className="flex items-center gap-2">
                    <AdminButton 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => alert(`Details: \n\nName: ${recipe.name}\nCalories: ${cals} kcal\nProtein: ${protein}g\nCarbs: ${carbs}g\nFat: ${fat}g\n\nSteps:\n${recipe.cookingStep}`)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </AdminButton>
                    
                    {recipe.status !== 'archived' && (
                      <AdminButton 
                        variant="ghost" 
                        size="icon" 
                        className="text-[var(--destructive)] hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(recipe.id || recipe._id)}
                        title="Archive Recipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </AdminButton>
                    )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          }) : null}
        </DataTable>
      </section>
    </main>
  );
}
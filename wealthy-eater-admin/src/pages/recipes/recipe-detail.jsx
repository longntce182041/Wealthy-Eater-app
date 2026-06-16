import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { ArrowLeft, Clock, Activity, Flame, Leaf, ListOrdered } from 'lucide-react';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(`/admin/recipes/${id}`);
        if (res.data?.success) {
          setRecipe(res.data.data);
        } else {
          setError('Không tìm thấy thông tin công thức nấu ăn.');
        }
      } catch (err) {
        console.error('Error fetching recipe detail:', err);
        setError(err?.response?.data?.message || 'Lỗi kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) return (
    <div className="py-12 text-center text-slate-500 flex flex-col items-center">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-semibold">Loading recipe info...</p>
    </div>
  );
  if (error) return (
    <div className="m-5 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
      {error}
    </div>
  );
  if (!recipe) return null;

  // Xử lý chuỗi các bước nấu từ Backend (\n) cắt nhỏ thành mảng 
  const stepsArray = Array.isArray(recipe.cookingStep) 
    ? recipe.cookingStep 
    : recipe.cookingStep?.split('\n').filter(step => step.trim() !== '') || [];

  return (
    <div className="space-y-6">
      {/* Thanh công cụ / Nút quay lại */}
      <div className="flex items-center">
        <button 
          onClick={() => navigate('/recipes')} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={18} />
          <span>Back to Recipes</span>
        </button>
      </div>

      {/* Bố cục Grid 2 Cột */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* CỘT TRÁI: Tổng quan hình ảnh & Chỉ số Calo Dinh dưỡng */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center flex flex-col items-center">
            {recipe.image_url || recipe.imageUrl ? (
              <img src={recipe.image_url || recipe.imageUrl} alt={recipe.name} className="w-full h-56 object-cover rounded-xl mb-4" />
            ) : (
              <div className="w-full h-56 bg-slate-50 rounded-xl flex items-center justify-center text-5xl mb-4 border border-slate-100">🍳</div>
            )}
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">{recipe.name}</h2>
            <p className="text-sm text-slate-500 leading-relaxed m-0">{recipe.description || 'Không có mô tả cho món ăn này.'}</p>
            
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${recipe.levelCooking === 'Easy' ? 'bg-emerald-100 text-emerald-700' : recipe.levelCooking === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {recipe.levelCooking}
              </span>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                <Clock size={14} /> {recipe.cookingTime} mins
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${recipe.status === 'Active' || recipe.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                {recipe.status}
              </span>
            </div>
          </div>

          {/* Khối hiển thị năng lượng Calories */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} /> Thông số dinh dưỡng
            </h4>
            
            <div className="bg-slate-50 p-4 rounded-xl text-center mb-5 border border-slate-100">
              <span className="text-xs font-bold text-emerald-600 tracking-widest block mb-1">TỔNG HÀM LƯỢNG CALO</span>
              <strong className="text-3xl font-extrabold text-emerald-600 flex justify-center items-center gap-2">
                <Flame size={24} />
                {recipe.nutrition?.calories || 0} kcal
              </strong>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Carbohydrates</span>
                  <strong className="text-amber-500">{recipe.nutrition?.carbs || 0}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min((recipe.nutrition?.carbs || 0) * 1.2, 100)}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Protein (Đạm)</span>
                  <strong className="text-emerald-500">{recipe.nutrition?.protein || 0}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((recipe.nutrition?.protein || 0) * 1.2, 100)}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Fat (Chất béo)</span>
                  <strong className="text-red-500">{recipe.nutrition?.fat || 0}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((recipe.nutrition?.fat || 0) * 1.2, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Nguyên liệu nhúng đi kèm & Các bước nấu chi tiết */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Danh mục nguyên liệu nhúng đi kèm */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Leaf size={18} className="text-emerald-500" />
              Linked Ingredients Database
            </h3>
            
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{ing.name || ing.ingredientId?.name || 'Ingredient'}</span>
                    <span className="text-sm font-bold text-emerald-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                      {ing.amount || ing.quantity} {ing.unit || 'g'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic py-2">No linked ingredients found for this recipe.</div>
            )}
          </div>

          {/* Danh sách các bước nấu chi tiết */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
              <ListOrdered size={18} className="text-emerald-500" />
              Detailed Preparation Steps
            </h3>

            {stepsArray.length > 0 ? (
              <div className="flex flex-col gap-4">
                {stepsArray.map((step, idx) => (
                  <div key={idx} className="flex gap-4 bg-slate-50 p-4 rounded-xl border-l-4 border-l-emerald-500 border border-y-slate-100 border-r-slate-100 shadow-sm">
                    <div className="shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                      {step.replace(/^\d+\.\s*/, '') /* Xóa số thứ tự cứng ở đầu chuỗi (nếu có) */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic py-2">Công thức này chưa ghi nhận các bước hướng dẫn.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
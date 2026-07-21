import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api'; 

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
        console.log("API Response Data:", res.data?.data);
        
        if (res.data?.success) {
          setRecipe(res.data.data);
        } else {
          setError('Recipe not found in database.');
        }
      } catch (err) {
        console.error('Error fetching details:', err);
        setError(err?.response?.data?.message || 'Server connection error.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Loading recipe info...</div>;
  if (error) return <div className="m-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</div>;
  if (!recipe) return null;

  // Xử lý bước nấu
  let stepsArray = [];
  const rawSteps = recipe.cooking_step || recipe.cookingStep || "";

  if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    stepsArray = recipe.steps;
  } else if (Array.isArray(rawSteps)) {
    stepsArray = rawSteps;
  } else if (typeof rawSteps === 'string' && rawSteps.trim() !== '') {
    const separator = rawSteps.includes('|') ? '|' : '\n';
    stepsArray = rawSteps.split(separator).filter(s => s.trim() !== '');
  }

  // Xử lý chỉ số dinh dưỡng
  let calories = recipe.nutrition?.calories || 0;
  let carbs = recipe.nutrition?.carbs || 0;
  let protein = recipe.nutrition?.protein || 0;
  let fat = recipe.nutrition?.fat || 0;

  if (calories === 0) {
    calories = recipe.calories || 291;
    carbs = 45;
    protein = 18;
    fat = 12;
  }

  // Xử lý nguyên liệu
  let ingredientsArray = recipe.ingredients || [];

  return (
    <div className="max-w-[1100px] mx-auto p-4 text-slate-800">
      {/* Nút quay lại */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/recipes')} 
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          ← Back to List
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* CỘT TRÁI (Bên dưới 1 cột, lên màn lớn chiếm 1/3) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Card Hình ảnh & Tên món */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            {recipe.imageUrl ? (
              <img 
                src={recipe.imageUrl} 
                alt={recipe.name} 
                className="w-full h-52 object-cover rounded-lg mb-4" 
              />
            ) : (
              <div className="w-full h-52 bg-slate-100 rounded-lg flex items-center justify-center text-5xl mb-4">
                🍳
              </div>
            )}
            
            <h2 className="text-xl font-bold text-slate-900 mb-3">{recipe.name}</h2>
            
            <div className="flex justify-center items-center gap-2 flex-wrap">
              <span className="capitalize px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
                {recipe.levelCooking || 'medium'}
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-full flex items-center gap-1">
                ⏱️ {recipe.cookingTime || 5} mins
              </span>
            </div>
          </div>

          {/* Card Chỉ số Dinh dưỡng */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              NUTRITIONAL PROFILE
            </h4>
            
            <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-center mb-5">
              <span className="text-xs text-sky-600 font-bold tracking-wide block mb-1">
                TOTAL ENERGY
              </span>
              <strong className="text-3xl font-extrabold text-sky-600">
                {calories} kcal
              </strong>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Carbs</span>
                  <span className="text-slate-900">{carbs}g</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((carbs / (carbs + protein + fat || 1)) * 100, 100)}%` }} 
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Protein</span>
                  <span className="text-slate-900">{protein}g</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((protein / (carbs + protein + fat || 1)) * 100, 100)}%` }} 
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Fat</span>
                  <span className="text-slate-900">{fat}g</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min((fat / (carbs + protein + fat || 1)) * 100, 100)}%` }} 
                    className="h-full bg-rose-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* CỘT PHẢI (Nhiều thông tin hơn - chiếm 2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Card Nguyên liệu */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              🛒 Ingredients
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ingredientsArray.map((ing, i) => (
                <div 
                  key={i} 
                  className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex justify-between items-center text-sm font-medium text-slate-700"
                >
                  <span>{ing.name || ing.ingredient_id?.name}</span>
                  <span className="text-sky-600 font-bold">
                    {ing.amount || ing.base_quantity || 0} {ing.unit || 'g'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card Các bước nấu */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              👨‍🍳 Preparation Steps
            </h3>
            <div className="flex flex-col gap-3">
              {stepsArray.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl border-l-4 border-l-emerald-500"
                >
                  <div className="bg-emerald-500 text-white min-w-[24px] h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed font-normal">
                    {typeof step === 'object' ? step.instruction : step}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
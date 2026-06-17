import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { LoadingState } from '../../components/ui/LoadingState';

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
        // Kiểm tra log để xem chính xác Backend trả về cái gì
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

  if (loading) return <LoadingState text="Loading recipe info..." />;
  if (error) return <div className="error-banner m-5">{error}</div>;
  if (!recipe) return null;

  // ==========================================
  // 👉 XỬ LÝ ĐỘNG CHO CÁC BƯỚC NẤU (COOKING STEPS)
  // ==========================================
  let stepsArray = [];
  const rawSteps = recipe.cooking_step || recipe.cookingStep || "";

  if (Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    stepsArray = recipe.steps;
  } else if (Array.isArray(rawSteps)) {
    stepsArray = rawSteps;
  } else if (typeof rawSteps === 'string' && rawSteps.trim() !== '') {
    // Tách dòng dựa trên ký tự xuống hàng \n hoặc dấu gạch đứng | nếu có
    const separator = rawSteps.includes('|') ? '|' : '\n';
    stepsArray = rawSteps.split(separator).filter(s => s.trim() !== '');
  }

//   // FALLBACK DỮ LIỆU MẪU: Nếu món cũ chưa có bước nấu, tự tạo dữ liệu mẫu hiển thị trực quan
//   if (stepsArray.length === 0) {
//     stepsArray = [
//       "Chuẩn bị và sơ chế sạch các nguyên liệu cơ bản cho món ăn.",
//       "Bật bếp nóng, phi thơm hành tỏi băm nhỏ với một chút dầu ăn.",
//       "Cho các nguyên liệu chính vào xào chín đều, nêm nếm gia vị vừa vị.",
//       "Trình bày món ăn ra đĩa hoàn chỉnh, thưởng thức khi còn nóng."
//     ];
//   }

  // ==========================================
  // 👉 XỬ LÝ ĐỘNG CHO DINH DƯỠNG (NUTRITION)
  // ==========================================
  // Nếu chưa link nguyên liệu (bằng 0), tự động giả lập chỉ số dinh dưỡng tiêu chuẩn dựa trên lượng calo cơ bản để tránh hiển thị trống
  let calories = recipe.nutrition?.calories || 0;
  let carbs = recipe.nutrition?.carbs || 0;
  let protein = recipe.nutrition?.protein || 0;
  let fat = recipe.nutrition?.fat || 0;

  if (calories === 0) {
    calories = 350; // Chỉ số tiêu chuẩn minh họa
    carbs = 45;
    protein = 18;
    fat = 12;
  }

  // ==========================================
  // 👉 XỬ LÝ ĐỘNG CHO NGUYÊN LIỆU (INGREDIENTS)
  // ==========================================
  let ingredientsArray = recipe.ingredients || [];
  if (ingredientsArray.length === 0) {
    ingredientsArray = [
      { name: "Nguyên liệu chính tổng hợp", amount: 200, unit: "g" },
      { name: "Gia vị nêm nếm (Đường, muối, tiêu)", amount: 15, unit: "g" },
      { name: "Dầu ăn thực vật", amount: 10, unit: "ml" }
    ];
  }

  return (
    <div className="py-1 px-0.5 text-slate-900">
      <div className="mb-6">
        <button onClick={() => navigate('/recipes')} className="btn-secondary">
          ← Back to List
        </button>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-6 items-start">
        
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          <div className="p-5 text-center bg-white rounded-xl shadow-sm border border-slate-200">
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-[220px] object-cover rounded-xl mb-4" />
            ) : (
              <div className="w-full h-[220px] bg-slate-100 rounded-xl flex items-center justify-center text-5xl mb-4">🍳</div>
            )}
            <h2 className="text-xl font-extrabold text-slate-900 m-0">{recipe.name}</h2>
            <div className="flex justify-center gap-2 mt-4">
              <span className={`badge ${recipe.levelCooking || 'medium'}`}>{recipe.levelCooking || 'medium'}</span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">⏱️ {recipe.cookingTime || 30} mins</span>
            </div>
          </div>

          {/* NUTRITION BOX */}
          <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-200">
            <h4 className="text-xs text-slate-500 font-bold mb-4 uppercase">NUTRITIONAL PROFILE</h4>
            <div className="bg-slate-50 p-4 rounded-lg text-center mb-5 border border-slate-200">
              <span className="text-[11px] text-primary font-bold block">TOTAL ENERGY</span>
              <strong className="text-2xl text-primary">{calories} kcal</strong>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-[13px]">
                  <span>Carbs</span><strong>{carbs}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                  <div style={{ width: `${Math.min((carbs / (carbs + protein + fat || 1)) * 100, 100)}%` }} className="h-full bg-amber-500 rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px]">
                  <span>Protein</span><strong>{protein}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                  <div style={{ width: `${Math.min((protein / (carbs + protein + fat || 1)) * 100, 100)}%` }} className="h-full bg-primary rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[13px]">
                  <span>Fat</span><strong>{fat}g</strong>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5">
                  <div style={{ width: `${Math.min((fat / (carbs + protein + fat || 1)) * 100, 100)}%` }} className="h-full bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* INGREDIENTS */}
          <div className="p-[22px] bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 m-0">🛒 Ingredients</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {ingredientsArray.map((ing, i) => (
                <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                  <span className="text-sm">{ing.name}</span>
                  <span className="text-primary font-semibold text-sm">{ing.amount || ing.base_quantity || 0} {ing.unit || 'g'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COOKING STEPS */}
          <div className="p-[22px] bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 m-0">👨‍🍳 Preparation Steps</h3>
            <div className="flex flex-col gap-3.5">
              {stepsArray.map((step, idx) => (
                <div key={idx} className="flex gap-4 bg-slate-50 p-4 rounded-lg border-l-4 border-l-primary shadow-sm">
                  <div className="bg-primary text-white min-w-[24px] h-[24px] rounded-full text-center text-xs leading-[24px] font-bold">
                    {idx + 1}
                  </div>
                  <div className="text-sm leading-relaxed text-slate-600">
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
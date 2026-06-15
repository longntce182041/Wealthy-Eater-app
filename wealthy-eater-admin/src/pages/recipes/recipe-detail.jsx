import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import '../dashboard.css'; 

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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading recipe info...</div>;
  if (error) return <div className="error-banner" style={{ margin: '20px' }}>{error}</div>;
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
    <div style={{ padding: '4px 2px', color: '#f8fafc' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/recipes')} className="btn-primary" style={{ background: '#334155' }}>
          ← Back to List
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="table-card" style={{ padding: '20px', textAlign: 'center' }}>
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
            ) : (
              <div style={{ width: '100%', height: '220px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '16px' }}>🍳</div>
            )}
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{recipe.name}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <span className={`badge ${recipe.levelCooking || 'medium'}`}>{recipe.levelCooking || 'medium'}</span>
              <span className="badge" style={{ background: '#1e293b' }}>⏱️ {recipe.cookingTime || 30} mins</span>
            </div>
          </div>

          {/* NUTRITION BOX */}
          <div className="table-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '15px' }}>NUTRITIONAL PROFILE</h4>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'block' }}>TOTAL ENERGY</span>
              <strong style={{ fontSize: '28px', color: '#38bdf8' }}>{calories} kcal</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Carbs</span><strong>{carbs}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min((carbs / (carbs + protein + fat || 1)) * 100, 100)}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Protein</span><strong>{protein}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min((protein / (carbs + protein + fat || 1)) * 100, 100)}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Fat</span><strong>{fat}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min((fat / (carbs + protein + fat || 1)) * 100, 100)}%`, height: '100%', background: '#ef4444', borderRadius: '3px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* INGREDIENTS */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>🛒 Ingredients</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {ingredientsArray.map((ing, i) => (
                <div key={i} style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ing.name}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{ing.amount || ing.base_quantity || 0} {ing.unit || 'g'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COOKING STEPS */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>👨‍🍳 Preparation Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {stepsArray.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '15px', background: '#1e293b', padding: '15px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                  <div style={{ background: '#10b981', color: '#fff', minWidth: '24px', height: '24px', borderRadius: '50%', textAlign: 'center', fontSize: '12px', lineHeight: '24px', fontWeight: 'bold' }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>
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
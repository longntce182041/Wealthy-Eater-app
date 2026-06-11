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
        console.log("=== API RECIPE DETAIL RESPONSE ===", res.data);
        
        if (res.data?.success) {
          setRecipe(res.data.data);
        } else {
          setError('Không tìm thấy dữ liệu công thức này.');
        }
      } catch (err) {
        console.error('Lỗi khi lấy chi tiết món ăn:', err);
        setError(err?.response?.data?.message || 'Lỗi kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải thông tin món ăn...</div>;
  if (error) return <div className="error-banner" style={{ margin: '20px' }}>{error}</div>;
  if (!recipe) return null;

  // =========================================================
  // 1. XỬ LÝ ĐỘNG NGUYÊN LIỆU (INGREDIENTS) - KHÔNG DÙNG DỮ LIỆU CỨNG
  // =========================================================
  const ingredientsArray = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  // =========================================================
  // 2. XỬ LÝ ĐỘNG CÁC BƯỚC NẤU ĂN (PREPARATION STEPS)
  // =========================================================
  let stepsArray = [];
  const rawSteps = recipe.steps || recipe.cooking_steps || recipe.cookingStep || [];
  
  if (Array.isArray(rawSteps)) {
    stepsArray = rawSteps;
  } else if (typeof rawSteps === 'string' && rawSteps.trim() !== '') {
    // Trường hợp backend trả về một chuỗi dài phân tách bằng dấu xuống dòng hoặc dấu gạch đứng
    stepsArray = rawSteps.split(/\r?\n|\|/).filter(s => s.trim() !== '');
  }

  // =========================================================
  // 3. XỬ LÝ CHỈ SỐ DINH DƯỠNG (NUTRITION) - KHÔNG BỊ CỘNG DỒN
  // =========================================================
  // Đọc trực tiếp từ object nutrition của Backend trả về, tránh tính toán thủ công bằng vòng lặp re-render làm tăng tiến calo
  const calories = recipe.nutrition?.calories ?? recipe.calories ?? 0;
  const carbs = recipe.nutrition?.carbs ?? recipe.carbs ?? 0;
  const protein = recipe.nutrition?.protein ?? recipe.protein ?? 0;
  const fat = recipe.nutrition?.fat ?? recipe.fat ?? 0;

  return (
    <div style={{ padding: '4px 2px', color: '#f8fafc' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/recipes')} className="btn-primary" style={{ background: '#334155', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }}>
          ← Quay lại danh sách
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* CỘT TRÁI: HÌNH ẢNH & THÔNG SỐ CALO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="table-card" style={{ padding: '20px', textAlign: 'center', background: '#111827', borderRadius: '12px' }}>
            {recipe.imageUrl || recipe.image_url ? (
              <img src={recipe.imageUrl || recipe.image_url} alt={recipe.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }} />
            ) : (
              <div style={{ width: '100%', height: '220px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '16px' }}>🍳</div>
            )}
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '10px 0' }}>{recipe.name}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <span className={`badge ${recipe.levelCooking || recipe.level_cooking || 'medium'}`}>
                {recipe.levelCooking || recipe.level_cooking || 'Medium'}
              </span>
              <span className="badge" style={{ background: '#1e293b', color: '#94a3b8' }}>
                ⏱️ {recipe.cookingTime || recipe.cooking_time || 0} Mins
              </span>
            </div>
          </div>

          {/* KHỐI DINH DƯỠNG */}
          <div className="table-card" style={{ padding: '20px', background: '#111827', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginBottom: '15px', letterSpacing: '0.05em' }}>THÔNG SỐ DINH DƯỠNG</h4>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>TỔNG HÀM LƯỢNG CALO</span>
              <strong style={{ fontSize: '28px', color: '#38bdf8' }}>{calories} kcal</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Carbohydrates</span><strong>{carbs}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min(carbs, 100)}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Protein (Đạm)</span><strong>{protein}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min(protein, 100)}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>Fat (Chất béo)</span><strong>{fat}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', marginTop: '5px' }}>
                  <div style={{ width: `${Math.min(fat, 100)}%`, height: '100%', background: '#ef4444', borderRadius: '3px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: NGUYÊN LIỆU THẬT & CÁC BƯỚC THỰC HIỆN ĐỘNG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* DANH MỤC NGUYÊN LIỆU ĐỘNG */}
          <div className="table-card" style={{ padding: '22px', background: '#111827', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>🛒 Danh mục nguyên liệu nhúng kèm</h3>
            {ingredientsArray.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {ingredientsArray.map((ing, i) => {
                  // Hỗ trợ bóc tách linh hoạt khi Backend dùng Populate nguyên liệu hoặc Object ID thuần
                  const name = ing.ingredient_id?.name || ing.ingredient?.name || ing.name || "Nguyên liệu";
                  const quantity = ing.base_quantity || ing.amount || 0;
                  const unit = ing.unit || ing.ingredient_id?.unit || 'g';

                  return (
                    <div key={i} style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{name}</span>
                      <strong style={{ color: '#38bdf8', fontSize: '14px' }}>{quantity} {unit}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Chưa nhúng cấu trúc nguyên liệu vào công thức này.</p>
            )}
          </div>

          {/* CÁC BƯỚC THỰC HIỆN ĐỘNG */}
          <div className="table-card" style={{ padding: '22px', background: '#111827', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>👨‍🍳 Các bước thực hiện chi tiết</h3>
            {stepsArray.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stepsArray.map((step, idx) => {
                  // Đề phòng trường hợp phần tử mảng là Object thay vì String thuần
                  const stepText = typeof step === 'object' ? (step.instruction || step.text || "") : step;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '15px', background: '#1e293b', padding: '14px 16px', borderRadius: '10px', borderLeft: '4px solid #10b981', alignItems: 'flex-start' }}>
                      <div style={{ background: '#10b981', color: '#fff', minWidth: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
                        {idx + 1}
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', flex: 1 }}>{stepText}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Công thức này chưa được thiết lập các bước thực hiện nấu ăn.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
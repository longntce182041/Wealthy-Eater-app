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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>Loading recipe info...</div>;
  if (error) return <div className="error-banner" style={{ margin: '20px' }}>{error}</div>;
  if (!recipe) return null;

  // Xử lý chuỗi các bước nấu từ Backend (\n) cắt nhỏ thành mảng 
  const stepsArray = Array.isArray(recipe.cookingStep) 
    ? recipe.cookingStep 
    : recipe.cookingStep?.split('\n').filter(step => step.trim() !== '') || [];

  return (
    <div style={{ padding: '4px 2px', color: '#f8fafc' }}>
      {/* Thanh công cụ / Nút quay lại */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => navigate('/recipes')} 
          className="btn-primary"
          style={{ background: '#334155', border: '1px solid #475569' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Bố cục Grid 2 Cột */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* CỘT TRÁI: Tổng quan hình ảnh & Chỉ số Calo Dinh dưỡng */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="table-card" style={{ padding: '20px', textAlign: 'center' }}>
            {recipe.imageUrl ? (
              <img src={recipe.imageUrl} alt={recipe.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px', border: '1px solid #334155' }} />
            ) : (
              <div style={{ width: '100%', height: '220px', background: '#1e293b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', marginBottom: '16px' }}>🍳</div>
            )}
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#fff' }}>{recipe.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{recipe.description || 'Không có mô tả cho món ăn này.'}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span className={`badge ${recipe.levelCooking}`}>{recipe.levelCooking}</span>
              <span className="badge" style={{ background: '#1e293b', color: '#cbd5e1' }}>⏱️ {recipe.cookingTime} mins</span>
              <span className={`badge ${recipe.status}`}>{recipe.status}</span>
            </div>
          </div>

          {/* Khối hiển thị năng lượng Calories */}
          <div className="table-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', fontWeight: 700 }}>Thông số dinh dưỡng</h4>
            
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '16px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, tracking: '0.1em', display: 'block', marginBottom: '2px' }}>TỔNG HÀM LƯỢNG CALO</span>
              <strong style={{ fontSize: '28px', color: '#38bdf8', fontWeight: '800' }}>{recipe.nutrition?.calories || 0} kcal</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Carbohydrates</span>
                  <strong style={{ color: '#f59e0b' }}>{recipe.nutrition?.carbs || 0}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ width: `${Math.min((recipe.nutrition?.carbs || 0) * 1.2, 100)}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Protein (Đạm)</span>
                  <strong style={{ color: '#10b981' }}>{recipe.nutrition?.protein || 0}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ width: `${Math.min((recipe.nutrition?.protein || 0) * 1.2, 100)}%`, height: '100%', background: '#10b981', borderRadius: '3px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Fat (Chất béo)</span>
                  <strong style={{ color: '#ef4444' }}>{recipe.nutrition?.fat || 0}g</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ width: `${Math.min((recipe.nutrition?.fat || 0) * 1.2, 100)}%`, height: '100%', background: '#ef4444', borderRadius: '3px' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Nguyên liệu nhúng đi kèm & Các bước nấu chi tiết */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Danh mục nguyên liệu nhúng đi kèm */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '6px', borderRadius: '6px', color: '#38bdf8', fontSize: '14px' }}>🌿</span>
              Linked Ingredients Database
            </h3>
            
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {recipe.ingredients.map((ing, idx) => (
                  <div key={idx} style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{ing.name || ing.ingredientId?.name || 'Ingredient'}</span>
                    <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 700, background: 'rgba(56, 189, 248, 0.08)', padding: '3px 10px', borderRadius: '6px' }}>
                      {ing.amount || ing.quantity} {ing.unit || 'g'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', padding: '10px 0' }}>No linked ingredients found for this recipe.</div>
            )}
          </div>

          {/* Danh sách các bước nấu chi tiết */}
          <div className="table-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '6px', borderRadius: '6px', color: '#10b981', fontSize: '14px' }}>🍳</span>
              Detailed Preparation Steps
            </h3>

            {stepsArray.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stepsArray.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '16px', background: '#1e293b', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #10b981', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <div style={{ background: '#10b981', color: '#fff', minWidth: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                      {step.replace(/^\d+\.\s*/, '') /* Xóa số thứ tự cứng ở đầu chuỗi (nếu có) */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', padding: '10px 0' }}>Công thức này chưa ghi nhận các bước hướng dẫn.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
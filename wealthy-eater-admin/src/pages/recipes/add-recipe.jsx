import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import '../dashboard.css';
import { toast } from 'react-hot-toast'; // Thư viện đã được giữ nguyên để phục vụ popup

export default function AddRecipePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [systemIngredients, setSystemIngredients] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    levelCooking: 'medium',
    cookingTime: '',
    baseServings: 1,
    status: 'draft'
  });

  const [cookingSteps, setCookingSteps] = useState(['']);
  const [selectedIngredients, setSelectedIngredients] = useState([
    { ingredient_id: '', base_quantity: '', unit: 'g' }
  ]);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const response = await apiClient.get('/admin/ingredients'); 
        console.log("Raw Ingredients API Response:", response.data);
        
        if (response.data?.success) {
          const resData = response.data.data;
          if (Array.isArray(resData)) {
            setSystemIngredients(resData);
          } else if (resData && Array.isArray(resData.ingredients)) {
            setSystemIngredients(resData.ingredients);
          } else if (resData && typeof resData === 'object') {
            const fallbackArray = Object.values(resData).find(val => Array.isArray(val));
            setSystemIngredients(fallbackArray || []);
          }
        } else if (Array.isArray(response.data)) {
          setSystemIngredients(response.data);
        }
      } catch (err) {
        console.error('Unable to load the system ingredient list:', err);
        setError('The system failed to load the ingredient list.');
      }
    };

    const token = localStorage.getItem('admin_session_jwt_token');
    if (!token) {
      localStorage.removeItem('admin_user');
      navigate('/login');
    } else {
      fetchSystemData();
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStepTextChange = (index, value) => {
    const updatedSteps = [...cookingSteps];
    updatedSteps[index] = value;
    setCookingSteps(updatedSteps);
  };

  const addNewStepField = () => setCookingSteps([...cookingSteps, '']);
  const removeStepField = (indexToRemove) => {
    if (cookingSteps.length === 1) return;
    setCookingSteps(cookingSteps.filter((_, index) => index !== indexToRemove));
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...selectedIngredients];
    updated[index][field] = value;
    
    if (field === 'ingredient_id') {
      const found = systemIngredients.find(i => i._id === value || i.id === value);
      if (found) {
        updated[index]['unit'] = found.unit || 'g';
      }
    }
    setSelectedIngredients(updated);
  };

  const addNewIngredientField = () => {
    setSelectedIngredients([...selectedIngredients, { ingredient_id: '', base_quantity: '', unit: 'g' }]);
  };

  const removeIngredientField = (indexToRemove) => {
    if (selectedIngredients.length === 1) return;
    setSelectedIngredients(selectedIngredients.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanedStepsArray = cookingSteps.filter(step => step.trim() !== '');
    if (cleanedStepsArray.length === 0) {
      setError('Vui lòng nhập ít nhất một bước thực hiện nấu ăn.');
      setLoading(false);
      return;
    }

    const cleanedIngredients = selectedIngredients
      .filter(item => item.ingredient_id && Number(item.base_quantity) > 0)
      .map(item => ({
        ingredient_id: item.ingredient_id,
        base_quantity: Number(item.base_quantity),
        unit: item.unit
      }));

    const payload = {
      name: formData.name.trim(),
      description: formData.description,
      image_url: formData.imageUrl,
      cooking_time: Number(formData.cookingTime) || 0,
      base_servings: Number(formData.baseServings) || 1,
      status: formData.status,
      level_cooking: formData.levelCooking,
      steps: cleanedStepsArray, 
      ingredients: cleanedIngredients
    };

    try {
      const response = await apiClient.post('/admin/recipes', payload);
      if (response.data?.success) {
        // 🔥 Đã chỉnh sửa: Popup màu xanh lá, kích thước lớn và kéo dài đúng 5 giây (5000ms)
        toast.success('Create a new recipe successfully!', {
          duration: 5000,
          style: {
            background: '#16a34a', // Màu xanh lá chuẩn (Tailwind green-600) cực nổi bật
            color: '#ffffff',      // Chữ trắng rõ ràng
            padding: '16px 24px',  // Tăng khoảng cách đệm bên trong giúp popup to hơn
            fontSize: '16px',      // Cỡ chữ to hơn một chút so với mặc định
            fontWeight: '500',     // Chữ đậm vừa phải thanh lịch
            borderRadius: '12px',  // Bo góc mềm mại, hiện đại
            minWidth: '360px',     // Đảm bảo chiều rộng bề thế, không bị co nhỏ
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)' // Đổ bóng đậm chất chuyên nghiệp
          },
          iconTheme: {
            primary: '#ffffff',    // Chuyển dấu tích tròn mặc định thành màu trắng cho tiệp màu nền
            secondary: '#16a34a'
          }
        });
        
        // Điều hướng mượt mà về trang quản lý danh sách món ăn
        navigate('/recipes');
      }
    } catch (err) {
      console.error('Error saving food:', err);
      const errorMsg = err?.response?.data?.message || err.message || 'Lưu thất bại, kiểm tra lại dữ liệu.';
      setError(errorMsg);
      
      // Popup thông báo thất bại cũng được làm to tương đương cho đồng bộ, sử dụng màu đỏ hệ thống
      toast.error(errorMsg, { 
        duration: 5000,
        style: {
          background: '#dc2626',
          color: '#ffffff',
          padding: '16px 24px',
          fontSize: '16px',
          borderRadius: '12px',
          minWidth: '360px'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '950px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Add New Recipe</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>The system will automatically synchronize and calculate the calorie index based on the ingredients</p>
        </div>
        <button type="button" className="btn-primary" style={{ background: '#334155', color: '#fff' }} onClick={() => navigate('/recipes')}>
          Cancel
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: '24px', padding: '12px', background: '#ef444422', border: '1px solid #ef4444', color: '#f87171', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* THÔNG TIN CƠ BẢN */}
        <div className="table-card" style={{ padding: '24px', background: '#111827', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>General information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Name of dish recipe *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ví dụ: Spagetti" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea name="description" rows="2" value={formData.description} onChange={handleInputChange} placeholder="Enter a brief description..." style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Difficulty level</label>
                <select name="levelCooking" value={formData.levelCooking} onChange={handleInputChange} style={inputStyle}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Cooking time (minutes) *</label>
                <input type="number" name="cookingTime" required min="1" value={formData.cookingTime} onChange={handleInputChange} placeholder="Phút" style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Serving size (per person) *</label>
                <input type="number" name="baseServings" required min="1" value={formData.baseServings} onChange={handleInputChange} style={inputStyle} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={labelStyle}>Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} style={inputStyle}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>URL</label>
              <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
        </div>

        {/* THÀNH PHẦN NGUYÊN LIỆU */}
        <div className="table-card" style={{ padding: '24px', background: '#111827', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>Eat the dish with its ingredients.</h3>
            <button type="button" onClick={addNewIngredientField} style={addBtnStyle}>+ Add Ingredient</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedIngredients.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 2 }}>
                  <select 
                    value={item.ingredient_id} 
                    onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- Select ingredients --</option>
                    {Array.isArray(systemIngredients) && systemIngredients.map(ing => (
                      <option key={ing._id || ing.id} value={ing._id || ing.id}>
                        {ing.name} ({ing.calories_per_unit || ing.calories || 0} kcal/{ing.unit || 'g'})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    placeholder="Quantity" 
                    min="0.1" 
                    step="any"
                    value={item.base_quantity}
                    onChange={(e) => handleIngredientChange(index, 'base_quantity', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ width: '60px', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>
                  {item.unit}
                </div>
                {selectedIngredients.length > 1 && (
                  <button type="button" onClick={() => removeIngredientField(index)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CÁC BƯỚC NẤU */}
        <div className="table-card" style={{ padding: '24px', background: '#111827', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>Implementation steps</h3>
            <button type="button" onClick={addNewStepField} style={addBtnStyle}>+ Add next step</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cookingSteps.map((stepText, index) => (
              <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: '#334155', color: '#38bdf8', minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <input type="text" value={stepText} required onChange={(e) => handleStepTextChange(index, e.target.value)} placeholder={` Detailed instructions for step ${index + 1}...`} style={inputStyle} />
                </div>
                {cookingSteps.length > 1 && (
                  <button type="button" onClick={() => removeStepField(index)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="submit" disabled={loading} style={{ minWidth: '180px', padding: '14px', fontSize: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Đang xử lý...' : 'Lưu công thức'}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: 500 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box', fontSize: '14px', outline: 'none' };
const addBtnStyle = { padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' };
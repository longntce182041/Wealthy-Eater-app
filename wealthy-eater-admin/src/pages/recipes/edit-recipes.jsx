import { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import '../dashboard.css';
import { toast } from 'react-hot-toast';

// 🌟 THAY ĐỔI CHÍNH: Nhận id, onClose (đóng popup), và onRefresh (tải lại danh sách) từ file cha recipes.jsx
export default function EditRecipePage({ id, onClose, onRefresh }) {
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

  // Cấu hình Style cho Toast thông báo
  const successToastStyle = {
    duration: 5000,
    style: { background: '#16a34a', color: '#ffffff', padding: '16px 24px', fontSize: '16px', fontWeight: '500', borderRadius: '12px', minWidth: '360px' }
  };

  const errorToastStyle = {
    duration: 5000,
    style: { background: '#dc2626', color: '#ffffff', padding: '16px 24px', fontSize: '16px', borderRadius: '12px', minWidth: '360px' }
  };

  // 1. TẢI DỮ LIỆU CŨ KHI MỞ POPUP CHỈNH SỬA
  useEffect(() => {
    if (!id) return; // Nếu không có ID truyền xuống thì không làm gì cả

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Tải danh sách nguyên liệu hệ thống trước
        const ingResponse = await apiClient.get('/admin/ingredients');
        if (ingResponse.data?.success) {
          const resData = ingResponse.data.data;
          if (Array.isArray(resData)) setSystemIngredients(resData);
          else if (resData && Array.isArray(resData.ingredients)) setSystemIngredients(resData.ingredients);
        }

        // Tải dữ liệu cũ của công thức này
        const recipeResponse = await apiClient.get(`/admin/recipes/${id}`);
        if (recipeResponse.data?.success) {
          const recipe = recipeResponse.data.data;
          
          setFormData({
            name: recipe.name || '',
            description: recipe.description || '',
            imageUrl: recipe.image_url || recipe.imageUrl || '',
            levelCooking: recipe.level_cooking || recipe.levelCooking || 'medium',
            cookingTime: recipe.cooking_time || recipe.cookingTime || '',
            baseServings: recipe.base_servings || recipe.baseServings || 1,
            status: recipe.status || 'draft'
          });

          if (recipe.steps && recipe.steps.length > 0) setCookingSteps(recipe.steps);
          if (recipe.ingredients && recipe.ingredients.length > 0) {
            setSelectedIngredients(recipe.ingredients.map(ing => ({
              ingredient_id: ing.ingredient_id?._id || ing.ingredient_id || '',
              base_quantity: ing.base_quantity || '',
              unit: ing.unit || 'g'
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching recipe data:', err);
        setError(err?.response?.data?.message || err.message || 'Failed to load recipe detail.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // 2. 🟢 HÀM SUBMIT LƯU THAY ĐỔI (ĐÃ THÊM ASYNC CHUẨN CHỈ DÒNG NÀY)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanedStepsArray = cookingSteps.filter(step => step.trim() !== '');
    if (cleanedStepsArray.length === 0) {
      setError('Please enter at least one implementation step.');
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
      const response = await apiClient.put(`/admin/recipes/${id}`, payload);
      if (response.data?.success) {
        toast.success('Update recipe successfully!', successToastStyle);
        onRefresh(); // Kích hoạt file cha tải lại danh sách mới
        onClose();   // Đóng popup lại luôn
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Update failed.';
      setError(errorMsg);
      toast.error(errorMsg, errorToastStyle);
    } finally {
      setLoading(false);
    }
  };

  // Các hàm bổ trợ xử lý Form của bác (Giữ nguyên)
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
      if (found) updated[index]['unit'] = found.unit || 'g';
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

  // GIAO DIỆN CHUYỂN THÀNH MODAL OVERLAY CHỨ KHÔNG PHẢI MỘT TRANG ĐỘC LẬP
  return (
    <div style={overlayStyle}>
      <div style={modalContentStyle}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Edit Recipe</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>Modify implementation steps, ingredients or general fields</p>
          </div>
          {/* Thay vì dùng navigate quay lại trang cũ, đổi thành hàm onClose đóng popup */}
          <button type="button" className="btn-primary" style={{ background: '#334155', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer' }} onClick={onClose}>
            ✕ Cancel
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '12px', background: '#ef444422', border: '1px solid #ef4444', color: '#f87171', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* THÔNG TIN CƠ BẢN */}
          <div className="table-card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>General information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Name of dish recipe *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea name="description" rows="2" value={formData.description} onChange={handleInputChange} style={{ ...inputStyle, resize: 'vertical' }} />
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
                  <input type="number" name="cookingTime" required min="1" value={formData.cookingTime} onChange={handleInputChange} style={inputStyle} />
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
                <label style={labelStyle}>Image URL</label>
                <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* THÀNH PHẦN NGUYÊN LIỆU */}
          <div className="table-card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>Ingredients</h3>
              <button type="button" onClick={addNewIngredientField} style={addBtnStyle}>+ Add Ingredient</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedIngredients.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 2 }}>
                    <select value={item.ingredient_id} onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)} style={inputStyle}>
                      <option value="">-- Select ingredients --</option>
                      {systemIngredients.map(ing => (
                        <option key={ing._id || ing.id} value={ing._id || ing.id}>
                          {ing.name} ({ing.calories_per_unit || ing.calories || 0} kcal/{ing.unit || 'g'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="number" placeholder="Quantity" min="0.1" step="any" value={item.base_quantity} onChange={(e) => handleIngredientChange(index, 'base_quantity', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ width: '60px', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>{item.unit}</div>
                  {selectedIngredients.length > 1 && (
                    <button type="button" onClick={() => removeIngredientField(index)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CÁC BƯỚC THỰC HIỆN */}
          <div className="table-card" style={{ padding: '24px', background: '#1e293b', borderRadius: '12px' }}>
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
                    <input type="text" value={stepText} required onChange={(e) => handleStepTextChange(index, e.target.value)} placeholder={`Detailed instructions for step ${index + 1}...`} style={inputStyle} />
                  </div>
                  {cookingSteps.length > 1 && (
                    <button type="button" onClick={() => removeStepField(index)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ padding: '14px 24px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
            <button type="submit" disabled={loading} style={{ minWidth: '180px', padding: '14px', fontSize: '15px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Processing...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles bổ trợ bọc giao diện nổi đè lên danh sách
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' };
const modalContentStyle = { background: '#111827', padding: '28px', borderRadius: '14px', width: '100%', maxWidth: '950px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #334155', color: '#f8fafc' };
const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: 500 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box', fontSize: '14px', outline: 'none' };
const addBtnStyle = { padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' };
import { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { toast } from 'react-hot-toast';
import { AdminButton } from '../../components/ui/AdminButton';

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
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] p-5 box-border">
      <div className="bg-white p-7 rounded-[14px] w-full max-w-[950px] max-h-[92vh] overflow-y-auto border border-slate-200 text-slate-900 shadow-xl relative">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="m-0 text-2xl text-slate-900 font-bold">Edit Recipe</h2>
            <p className="mt-1 text-sm text-slate-500">Modify implementation steps, ingredients or general fields</p>
          </div>
          {/* Thay vì dùng navigate quay lại trang cũ, đổi thành hàm onClose đóng popup */}
        <button type="button" className="btn-secondary" onClick={onClose}>
            ✕ Cancel
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-500 text-red-500 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="flex flex-col gap-6">
          
          {/* THÔNG TIN CƠ BẢN */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="m-0 mb-5 pb-2.5 text-lg text-primary border-b border-slate-200 font-semibold">General information</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Name of dish recipe *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Description</label>
                <textarea name="description" rows="2" value={formData.description} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y" />
              </div>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Difficulty level</label>
                  <select name="levelCooking" value={formData.levelCooking} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Cooking time (minutes) *</label>
                  <input type="number" name="cookingTime" required min="1" value={formData.cookingTime} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Serving size (per person) *</label>
                  <input type="number" name="baseServings" required min="1" value={formData.baseServings} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Image URL</label>
                <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* THÀNH PHẦN NGUYÊN LIỆU */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-slate-200">
              <h3 className="m-0 text-lg text-primary font-semibold">Ingredients</h3>
              <button type="button" onClick={addNewIngredientField} className="px-3.5 py-1.5 bg-slate-100 text-primary border border-slate-200 rounded-md cursor-pointer font-semibold text-[13px] hover:bg-slate-200 transition-colors">+ Add Ingredient</button>
            </div>
            <div className="flex flex-col gap-3">
              {selectedIngredients.map((item, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <div className="flex-[2]">
                    <select value={item.ingredient_id} onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                      <option value="">-- Select ingredients --</option>
                      {systemIngredients.map(ing => (
                        <option key={ing._id || ing.id} value={ing._id || ing.id}>
                          {ing.name} ({ing.calories_per_unit || ing.calories || 0} kcal/{ing.unit || 'g'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <input type="number" placeholder="Quantity" min="0.1" step="any" value={item.base_quantity} onChange={(e) => handleIngredientChange(index, 'base_quantity', e.target.value)} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div className="w-[60px] text-slate-400 text-sm font-bold">{item.unit}</div>
                  {selectedIngredients.length > 1 && (
                    <button type="button" onClick={() => removeIngredientField(index)} className="bg-red-500 text-white border-none py-2 px-3 rounded-lg cursor-pointer hover:bg-red-600 transition-colors">🗑️</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CÁC BƯỚC THỰC HIỆN */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-slate-200">
              <h3 className="m-0 text-lg text-primary font-semibold">Implementation steps</h3>
              <button type="button" onClick={addNewStepField} className="px-3.5 py-1.5 bg-slate-100 text-primary border border-slate-200 rounded-md cursor-pointer font-semibold text-[13px] hover:bg-slate-200 transition-colors">+ Add next step</button>
            </div>
            <div className="flex flex-col gap-3.5">
              {cookingSteps.map((stepText, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <div className="bg-slate-100 text-primary min-w-[28px] h-[28px] rounded-full flex items-center justify-center font-bold text-[13px]">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <input type="text" value={stepText} required onChange={(e) => handleStepTextChange(index, e.target.value)} placeholder={`Detailed instructions for step ${index + 1}...`} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  {cookingSteps.length > 1 && (
                    <button type="button" onClick={() => removeStepField(index)} className="bg-red-500 text-white border-none py-2 px-3 rounded-lg cursor-pointer hover:bg-red-600 transition-colors">🗑️</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-3">
            <AdminButton type="button" onClick={onClose} variant="secondary" className="px-6 h-12">
              Close
            </AdminButton>
            <AdminButton type="submit" isLoading={loading} className="min-w-[180px] h-[48px] text-[15px]">
              Save Changes
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}

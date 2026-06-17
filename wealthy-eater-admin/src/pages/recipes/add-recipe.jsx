import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { toast } from 'react-hot-toast'; 
import { AdminButton } from '../../components/ui/AdminButton';

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
    <div className="max-w-[950px] mx-auto p-5">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="m-0 text-2xl text-slate-900 font-bold">Add New Recipe</h2>
          <p className="mt-1 text-sm text-slate-500">The system will automatically synchronize and calculate the calorie index based on the ingredients</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate('/recipes')}>
          Cancel
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
              <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Ví dụ: Spagetti" className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Description</label>
              <textarea name="description" rows="2" value={formData.description} onChange={handleInputChange} placeholder="Enter a brief description..." className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y" />
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
                <input type="number" name="cookingTime" required min="1" value={formData.cookingTime} onChange={handleInputChange} placeholder="Phút" className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
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
              <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">URL</label>
              <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://..." className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          </div>
        </div>

        {/* THÀNH PHẦN NGUYÊN LIỆU */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-5 pb-2.5 border-b border-slate-200">
            <h3 className="m-0 text-lg text-primary font-semibold">Eat the dish with its ingredients.</h3>
            <button type="button" onClick={addNewIngredientField} className="px-3.5 py-1.5 bg-slate-100 text-primary border border-slate-200 rounded-md cursor-pointer font-semibold text-[13px] hover:bg-slate-200 transition-colors">+ Add Ingredient</button>
          </div>
          <div className="flex flex-col gap-3">
            {selectedIngredients.map((item, index) => (
              <div key={index} className="flex gap-3 items-center">
                <div className="flex-[2]">
                  <select 
                    value={item.ingredient_id} 
                    onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">-- Select ingredients --</option>
                    {Array.isArray(systemIngredients) && systemIngredients.map(ing => (
                      <option key={ing._id || ing.id} value={ing._id || ing.id}>
                        {ing.name} ({ing.calories_per_unit || ing.calories || 0} kcal/{ing.unit || 'g'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <input 
                    type="number" 
                    placeholder="Quantity" 
                    min="0.1" 
                    step="any"
                    value={item.base_quantity}
                    onChange={(e) => handleIngredientChange(index, 'base_quantity', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="w-[60px] text-slate-400 text-sm font-bold">
                  {item.unit}
                </div>
                {selectedIngredients.length > 1 && (
                  <button type="button" onClick={() => removeIngredientField(index)} className="bg-red-500 text-white border-none py-2 px-3 rounded-lg cursor-pointer hover:bg-red-600 transition-colors">🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CÁC BƯỚC NẤU */}
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
                  <input type="text" value={stepText} required onChange={(e) => handleStepTextChange(index, e.target.value)} placeholder={` Detailed instructions for step ${index + 1}...`} className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
                {cookingSteps.length > 1 && (
                  <button type="button" onClick={() => removeStepField(index)} className="bg-red-500 text-white border-none py-2 px-3 rounded-lg cursor-pointer hover:bg-red-600 transition-colors">🗑️</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-2.5">
          <AdminButton type="submit" isLoading={loading} className="min-w-[180px] h-[48px] text-[15px]">
            Lưu công thức
          </AdminButton>
        </div>
      </form>
    </div>
  );
}

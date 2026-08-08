import { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/api';
import { toast } from 'react-hot-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { AdminButton } from '../../components/ui/AdminButton';

export default function EditRecipePage({ id, onClose, onRefresh }) {
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [systemIngredients, setSystemIngredients] = useState([]);

  // State quản lý Preview ảnh
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);

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

  // Cấu hình Toast
  const successToastStyle = {
    duration: 5000,
    style: { background: '#16a34a', color: '#ffffff', padding: '16px 24px', fontSize: '16px', fontWeight: '500', borderRadius: '12px', minWidth: '360px' }
  };

  const errorToastStyle = {
    duration: 5000,
    style: { background: '#dc2626', color: '#ffffff', padding: '16px 24px', fontSize: '16px', borderRadius: '12px', minWidth: '360px' }
  };

  // 1. TẢI DỮ LIỆU CŨ KHI MỞ POPUP
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const ingResponse = await apiClient.get('/admin/ingredients/select-list');
        if (ingResponse.data?.success && Array.isArray(ingResponse.data.data)) {
          setSystemIngredients(ingResponse.data.data);
        }

        const recipeResponse = await apiClient.get(`/admin/recipes/${id}`);
        if (recipeResponse.data?.success) {
          const recipe = recipeResponse.data.data;
          
          // Bóc tách URL ảnh linh hoạt từ response chi tiết
          const currentImg = recipe.image_url || recipe.imageUrl || recipe.image || recipe.photo || '';
          
          setFormData({
            name: recipe.name || '',
            description: recipe.description || '',
            imageUrl: currentImg,
            levelCooking: recipe.level_cooking || recipe.levelCooking || 'medium',
            cookingTime: recipe.cooking_time || recipe.cookingTime || '',
            baseServings: recipe.base_servings || recipe.baseServings || 1,
            status: recipe.status || 'draft'
          });

          if (currentImg) {
            setImagePreview(currentImg);
          }

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

  // 📸 HÀM XỬ LÝ CHỌN FILE ẢNH TỪ MÁY TÍNH
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP).', errorToastStyle);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB.', errorToastStyle);
      return;
    }

    setImageFile(file);
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);
  };

  // ❌ XÓA/HUỶ CHỌN ẢNH
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. 🟢 HÀM SUBMIT LƯU THAY ĐỔI
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Bắt đầu bằng URL hiện tại trong formData (TUYỆT ĐỐI KHÔNG dùng imagePreview vì nó chứa link blob tạm)
    let finalImageUrl = formData.imageUrl || '';

    // 📸 BƯỚC BÓC TÁCH TRONG handleSubmitForm (xung quanh dòng 148-160)
if (imageFile) {
  try {
    setUploadingImage(true);
    const imageFormData = new FormData();
    imageFormData.append('image', imageFile);

    const uploadRes = await apiClient.post('/admin/recipes/upload-image', imageFormData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const resData = uploadRes.data;
    console.log('📸 Upload API Response FULL:', resData);

    // 🎯 LẤY URL BẰNG BỘ LỌC TỔNG HỢP SIÊU CẤP:
    let serverUrl = null;

    if (typeof resData === 'string' && resData.startsWith('http')) {
      // TH1: Backend trả trực tiếp chuỗi URL (String)
      serverUrl = resData;
    } else if (resData && typeof resData === 'object') {
      // TH2: Backend trả Object
      serverUrl = 
        resData.url || 
        resData.imageUrl || 
        resData.image_url || 
        resData.secure_url ||
        resData.path ||
        resData.file ||
        // Kiểm tra nếu nằm trong resData.data
        (typeof resData.data === 'string' ? resData.data : null) ||
        resData.data?.url || 
        resData.data?.imageUrl || 
        resData.data?.image_url ||
        resData.data?.secure_url ||
        resData.data?.path ||
        // Kiểm tra nếu trả về Mảng (Array)
        (Array.isArray(resData) ? resData[0]?.url || resData[0] : null) ||
        (Array.isArray(resData.data) ? resData.data[0]?.url || resData.data[0] : null);
    }

    console.log('👉 URL sau khi bóc tách được:', serverUrl);

    // Kiểm tra tính hợp lệ
    if (serverUrl && typeof serverUrl === 'string' && serverUrl.startsWith('http')) {
      finalImageUrl = serverUrl;
    } else {
      throw new Error(`Server không trả về URL ảnh hợp lệ. Cấu trúc nhận được: ${JSON.stringify(resData)}`);
    }

  } catch (uploadErr) {
    console.error('Failed to upload image:', uploadErr);
    const errMsg = uploadErr?.response?.data?.message || uploadErr.message || 'Failed to upload image file.';
    setError(errMsg);
    toast.error(errMsg, errorToastStyle);
    setLoading(false);
    setUploadingImage(false);
    return;
  } finally {
    setUploadingImage(false);
  }
}
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

    // Payload chuẩn đét
    const payload = {
      name: formData.name.trim(),
      description: formData.description,
      imageUrl: finalImageUrl,
      image_url: finalImageUrl,
      cooking_time: Number(formData.cookingTime) || 0,
      cookingTime: Number(formData.cookingTime) || 0,
      base_servings: Number(formData.baseServings) || 1,
      baseServings: Number(formData.baseServings) || 1,
      status: formData.status,
      level_cooking: formData.levelCooking,
      levelCooking: formData.levelCooking,
      steps: cleanedStepsArray,
      ingredients: cleanedIngredients
    };

    try {
      const response = await apiClient.put(`/admin/recipes/${id}`, payload);
      if (response.data?.success || response.status === 200) {
        toast.success('Update recipe successfully!', successToastStyle);
        
        onClose();
        if (typeof onRefresh === 'function') {
          setTimeout(() => {
            onRefresh();
          }, 100);
        }
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err.message || 'Update failed.';
      setError(errorMsg);
      toast.error(errorMsg, errorToastStyle);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="fixed inset-0 bg-black/75 flex justify-center items-center z-[1000] p-5 box-border">
      <div className="bg-white p-7 rounded-[14px] w-full max-w-[950px] max-h-[92vh] overflow-y-auto border border-slate-200 text-slate-900 shadow-xl relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="m-0 text-2xl text-slate-900 font-bold">Edit Recipe</h2>
            <p className="mt-1 text-sm text-slate-500">Modify implementation steps, ingredients or image</p>
          </div>
          <button type="button" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" onClick={onClose}>
            ✕ Cancel
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-500 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="flex flex-col gap-6">
          
          {/* THÔNG TIN CƠ BẢN & BỘ UPLOAD ẢNH */}
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

              {/* 🖼️ KHU VỰC CHỌN VÀ PREVIEW ẢNH MÓN ĂN */}
              <div>
                <label className="block mb-1.5 text-[13px] text-slate-600 font-semibold">Recipe Image</label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                {imagePreview ? (
                  <div className="relative w-full max-w-[280px] h-44 rounded-xl border border-slate-200 overflow-hidden group shadow-sm bg-slate-50">
                    <img src={imagePreview} alt="Recipe Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/90 text-slate-800 rounded-lg hover:bg-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change Image
                      </button>
                      <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-600/90 text-white rounded-lg hover:bg-red-600 text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-primary/60 bg-slate-50 hover:bg-slate-100/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-primary">Click to upload photo</span>
                      <span className="text-xs text-slate-400 block mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                    </div>
                  </div>
                )}
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

          {/* FOOTER BUTTONS */}
          <div className="flex justify-end mt-4 gap-3">
            <AdminButton type="button" onClick={onClose} variant="secondary" className="px-6 h-12">
              Close
            </AdminButton>
            <AdminButton type="submit" isLoading={loading || uploadingImage} className="min-w-[180px] h-[48px] text-[15px]">
              {uploadingImage ? 'Uploading Image...' : 'Save Changes'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}
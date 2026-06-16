import { useCallback, useEffect, useState, useRef } from 'react';
import apiClient from '../../services/api';
import { Trash2, Edit, Plus, Image as ImageIcon, Search, Filter, FileUp } from 'lucide-react';
import { toast } from 'react-toastify';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';

const IngredientPage = () => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null); 

    // --- STATE PHÂN TRANG ---
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const ITEMS_PER_PAGE = 12;

    // --- STATE MODAL ---
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // --- STATE TÌM KIẾM & LỌC ---
    const [filters, setFilters] = useState({
        keyword: '',
        unit: ''
    });

    // --- STATE FORM DATA ---
    const [formData, setFormData] = useState({
        name: '', calories_per_unit: '', protein: '', carbs: '', fat: '', unit: 'gram', image_url: '', imageFile: null, description: ''
    });

    const [availableMicros, setAvailableMicros] = useState([]);
    const [selectedMicros, setSelectedMicros] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);

    const blockInvalidChar = (e) => ['e', 'E', '+', '-', ',', '.'].includes(e.key) && e.preventDefault();

    const handleNumberChange = (field, value) => {
        let val = value;
        if (val > 10000) val = 10000;
        if (val < 0) val = 0;
        setFormData({ ...formData, [field]: val });
    };

    // Gọi API lấy danh sách
    const fetchIngredients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/admin/ingredients', {
                params: {
                    keyword: filters.keyword,
                    unit: filters.unit,
                    page: currentPage,      
                    limit: ITEMS_PER_PAGE   
                }
            });
            if (res.data.success) {
                setIngredients(res.data.data.ingredients);
                setTotalPages(res.data.data.totalPages || 1);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }, [filters.keyword, filters.unit, currentPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchIngredients();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchIngredients]);



    useEffect(() => {
        const fetchMicros = async () => {
            try {
                const res = await apiClient.get('/admin/micronutrients', { params: { limit: 1000 } });
                if (res.data && res.data.success) {
                    setAvailableMicros(res.data.data?.micronutrients || res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to load micronutrients', err);
            }
        };
        fetchMicros();
    }, []);

    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
            toast.error("Please upload an Excel file (.xlsx or .xls)");
            return;
        }

        const dataForm = new FormData();
        dataForm.append('file', file);

        try {
            setLoading(true);
            const res = await apiClient.post('/admin/ingredients/import', dataForm, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                toast.success(res.data.message || "Imported ingredients successfully!");
                fetchIngredients(); 
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to import Excel file");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({ name: '', calories_per_unit: '', protein: '', carbs: '', fat: '', unit: 'gram', image_url: '', imageFile: null, description: '' });
        setSelectedMicros([]);
        setShowModal(true);
    };

    const handleOpenEdit = async (item) => {
        setIsEditing(true);
        setCurrentId(item._id);
        try {
            const res = await apiClient.get(`/admin/ingredients/${item._id}`);
            if (res.data && res.data.success) {
                const data = res.data.data;
                setFormData({
                    name: data.name || '',
                    calories_per_unit: data.calories_per_unit || '',
                    protein: data.protein || '',
                    carbs: data.carbs || '',
                    fat: data.fat || '',
                    unit: data.unit || 'gram',
                    image_url: data.image_url || '',
                    imageFile: null,
                    description: data.description || ''
                });
                const micros = (data.micronutrients || []).map(m => ({ 
                    micronutrientId: m.micronutrientId?._id || m.micronutrientId || m._id || m.id, 
                    amount: m.amount 
                }));
                setSelectedMicros(micros);
            } else {
                setFormData({ ...item, image_url: item.image_url || '', imageFile: null, description: item.description || '' });
                setSelectedMicros([]);
            }
        } catch (error) {
            console.error(error);
            setFormData({ ...item, image_url: item.image_url || '', imageFile: null, description: item.description || '' });
            setSelectedMicros([]);
        }
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this ingredient?")) return;
        try {
            const res = await apiClient.delete(`/admin/ingredients/delete/${id}`);
            toast.success(res.data.message);
            fetchIngredients();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error deleting");
        }
    };

    // 🎯 Đã sửa lỗi: Dùng apiClient đúng tuyến đường /admin/ingredients để lấy dữ liệu detail thành công
    const handleView = async (id) => {
        try {
            const res = await apiClient.get(`/admin/ingredients/${id}`);
            if (res.data && res.data.success) {
                setDetailData(res.data.data);
                setShowDetail(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load detail');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('calories_per_unit', formData.calories_per_unit);
            payload.append('protein', formData.protein);
            payload.append('carbs', formData.carbs);
            payload.append('fat', formData.fat);
            payload.append('unit', formData.unit);
            payload.append('description', formData.description || '');
            
            if (formData.imageFile) {
                payload.append('image', formData.imageFile);
            }
            
            payload.append('micronutrients', JSON.stringify(selectedMicros));

            let res;
            if (isEditing) {
                res = await apiClient.put(`/admin/ingredients/update/${currentId}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await apiClient.post('/admin/ingredients/create', payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success(res.data.message);
            setShowModal(false);
            fetchIngredients();
        } catch (error) {
            const serverMessage = error.response?.data?.message || error.response?.data?.errors?.map?.(e => Object.values(e)[0])?.join(', ');
            toast.error(serverMessage || "Action failed");
        }
    };

    return (
        <div className="space-y-6">
            {/* --- TOOLBAR --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text" placeholder="Search ingredients..."
                            value={filters.keyword} 
                            onChange={(e) => {
                                setFilters({ ...filters, keyword: e.target.value });
                                setCurrentPage(1);
                            }}
                            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                        />
                    </div>
                    <div className="relative w-40">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Filter size={16} />
                        </div>
                        <select
                            value={filters.unit}
                            onChange={(e) => {
                                setFilters({ ...filters, unit: e.target.value });
                                setCurrentPage(1);
                            }}
                            className="block w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
                        >
                            <option value="">All Units</option>
                            <option value="gram">gram</option>
                            <option value="ml">ml</option>
                            <option value="piece">piece</option>
                            <option value="cup">cup</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportExcel} 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                    />
                    <button 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors"
                        onClick={() => fileInputRef.current.click()} 
                        title="Import ingredients from Excel template file"
                    >
                        <FileUp size={18} />
                        <span>Import Excel</span>
                    </button>

                    <button 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20"
                        onClick={handleOpenCreate}
                    >
                        <Plus size={18} />
                        <span>Add Ingredient</span>
                    </button>
                </div>
            </div>

            {/* --- LIST CARDS --- */}
            {loading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium text-sm">Loading data...</p>
                </div>
            ) : (
                <>
                    {ingredients.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-sm">No ingredients found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {ingredients.map((item) => (
                                <div key={item._id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                    <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <ImageIcon size={40} className="text-slate-300" />
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{item.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Calories: <strong className="text-emerald-600 font-bold">{item.calories_per_unit}</strong> / {item.unit}
                                        </p>
                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                                            <button onClick={() => handleView(item._id)} className="text-xs font-bold text-slate-600 hover:text-emerald-600 uppercase tracking-wider px-2 py-1 transition-colors">
                                                View
                                            </button>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- PAGINATION CONTROLS --- */}
                    {ingredients.length > 0 && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPrevPage={handlePrevPage} 
                            onNextPage={handleNextPage} 
                        />
                    )}
                </>
            )}

            {/* --- MODAL CREATE / EDIT --- */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
                footer={
                    <>
                        <button type="button" className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="button" onClick={handleSubmit} className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm shadow-emerald-500/20">{isEditing ? 'Update Ingredient' : 'Add Ingredient'}</button>
                    </>
                }
            >
                <form id="ingredientForm" onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Ingredient Name</label>
                        <input type="text" className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Calories / Unit</label>
                            <input type="number" className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" onKeyDown={blockInvalidChar} value={formData.calories_per_unit} onChange={e => handleNumberChange('calories_per_unit', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Unit</label>
                            <select className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                <option value="gram">gram</option>
                                <option value="ml">ml</option>
                                <option value="piece">piece</option>
                                <option value="cup">cup</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Protein (g)</label>
                            <input type="number" className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" onKeyDown={blockInvalidChar} value={formData.protein} onChange={e => handleNumberChange('protein', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Carbs (g)</label>
                            <input type="number" className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" onKeyDown={blockInvalidChar} value={formData.carbs} onChange={e => handleNumberChange('carbs', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-slate-700">Fats (g)</label>
                            <input type="number" className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" onKeyDown={blockInvalidChar} value={formData.fat} onChange={e => handleNumberChange('fat', e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Image</label>
                        <div className="flex gap-4 items-center">
                            {formData.image_url && !formData.imageFile && (
                                <img src={formData.image_url} alt="Current" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                            )}
                            {formData.imageFile && (
                                <img src={URL.createObjectURL(formData.imageFile)} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                            )}
                            <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors cursor-pointer" accept="image/*" onChange={e => setFormData({ ...formData, imageFile: e.target.files[0] })} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Description</label>
                        <textarea className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                    </div>

                    {/* MICRONUTRIENTS SECTION */}
                    <div className="space-y-3 pt-2">
                        <label className="block text-sm font-semibold text-slate-700">Micronutrients (optional)</label>
                        {selectedMicros.map((m, idx) => (
                            <div key={idx} className="flex gap-2">
                                <select
                                    className="block flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
                                    value={m.micronutrientId || ''}
                                    onChange={e => {
                                        const copy = [...selectedMicros];
                                        copy[idx].micronutrientId = e.target.value;
                                        setSelectedMicros(copy);
                                    }}
                                >
                                    <option value="">Select micronutrient</option>
                                    {availableMicros
                                        .filter(a => {
                                            const id = a._id || a.id;
                                            const already = selectedMicros.some((s, si) => s.micronutrientId === id && si !== idx);
                                            return !already || (m.micronutrientId && (m.micronutrientId === id));
                                        })
                                        .map(a => <option key={a._id || a.id} value={a._id || a.id}>{a.name}</option>)}
                                </select>
                                <input type="number" className="block w-28 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors" min="0" onKeyDown={blockInvalidChar} value={m.amount}
                                    onChange={e => {
                                        const copy = [...selectedMicros];
                                        copy[idx].amount = e.target.value;
                                        setSelectedMicros(copy);
                                    }}
                                    placeholder="amount" />
                                <button type="button" onClick={() => { const copy = selectedMicros.filter((_, i) => i !== idx); setSelectedMicros(copy); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        <div className="pt-2">
                            <button type="button" onClick={() => setSelectedMicros([...selectedMicros, { micronutrientId: '', amount: '' }])} className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl text-sm font-semibold transition-colors">
                                <Plus size={16} /> Add micronutrient
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* --- DETAIL MODAL --- */}
            <Modal
                isOpen={showDetail && !!detailData}
                onClose={() => { setShowDetail(false); setDetailData(null); }}
                title={detailData?.name}
                footer={
                    <button type="button" className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors" onClick={() => { setShowDetail(false); setDetailData(null); }}>Close</button>
                }
            >
                {detailData && (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Unit</div>
                                <div className="text-lg font-bold text-slate-900">{detailData.unit}</div>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <div className="text-xs font-semibold text-emerald-600/80 mb-1 uppercase tracking-wider">Calories</div>
                                <div className="text-lg font-bold text-emerald-700">{detailData.calories_per_unit}</div>
                            </div>
                        </div>
                        
                        <div className="bg-white border border-slate-200 p-4 rounded-xl mb-6 flex justify-between text-center divide-x divide-slate-100 shadow-sm">
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Protein</div>
                                <div className="text-lg font-bold text-slate-900">{detailData.protein}g</div>
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Carbs</div>
                                <div className="text-lg font-bold text-slate-900">{detailData.carbs}g</div>
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Fats</div>
                                <div className="text-lg font-bold text-slate-900">{detailData.fat || detailData.fats}g</div>
                            </div>
                        </div>

                        {detailData.description && (
                            <div className="mb-6 space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Description</label>
                                <div className="bg-slate-50 text-slate-700 p-4 rounded-xl text-sm leading-relaxed border border-slate-100">
                                    {detailData.description}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100">
                            <h4 className="font-bold text-slate-900 mb-4">Micronutrients</h4>
                            {detailData.micronutrients && detailData.micronutrients.length ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Amount</th>
                                                <th className="px-4 py-3">Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {detailData.micronutrients.map((m, i) => (
                                                <tr key={i} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{m.micronutrientId?.name || m.name || m.micronutrientId}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600">{m.amount}</td>
                                                    <td className="px-4 py-3 text-slate-600 text-sm">{m.micronutrientId?.unit || m.unit || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-slate-50 text-slate-500 text-center py-8 rounded-xl border border-slate-100 border-dashed text-sm font-medium">
                                    No micronutrients linked to this ingredient.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default IngredientPage;
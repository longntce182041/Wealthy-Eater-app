import { useCallback, useEffect, useState, useRef } from 'react';
import apiClient from '../../services/api';
import { Trash2, Edit, Plus, X, Image as ImageIcon, Search, ChevronLeft, ChevronRight, FileUp, PackageSearch, UploadCloud } from 'lucide-react';

// 🎯 ĐỔI SANG THƯ VIỆN HOT TOAST Ở ĐÂY
import { toast } from 'react-hot-toast'; 

import { DataTable, DataTableRow, DataTableCell } from '../../components/ui/DataTable';
import { AdminButton } from '../../components/ui/AdminButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

// 🎯 ĐỊNH NGHĨA SẴN KHUNG STYLE ĐỂ TÁI SỬ DỤNG CHO ĐẸP VÀ GỌN
const successStyle = {
    style: {
        background: '#16a34a', // Màu xanh lá cây đậm
        color: '#ffffff',      // Chữ trắng
    },
    iconTheme: { primary: '#ffffff', secondary: '#16a34a' } 
};

const errorStyle = {
    style: {
        background: '#dc2626', // Màu đỏ hệ thống
        color: '#ffffff',
    }
};

const IngredientPage = () => {
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null); 
    const imageInputRef = useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const ITEMS_PER_PAGE = 12;

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [filters, setFilters] = useState({ keyword: '', unit: '' });

    const [formData, setFormData] = useState({
        name: '', calories_per_unit: '', protein: '', carbs: '', fat: '', unit: 'gram', description: '',
        image_file: null, preview_url: ''
    });

    const [availableMicros, setAvailableMicros] = useState([]);
    const [selectedMicros, setSelectedMicros] = useState([]);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);

    const blockInvalidChar = (e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault();

    const handleNumberChange = (field, value) => {
        if (value === '') {
            setFormData({ ...formData, [field]: '' });
            return;
        }
        let val = Number(value);
        if (val > 10000) val = 10000;
        if (val < 0) val = 0;
        setFormData({ ...formData, [field]: value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            // 🎯 SỬA THÔNG BÁO LỖI CHỌN FILE
            toast.error("Please select a valid image file (PNG, JPG, JPEG)", errorStyle);
            return;
        }

        setFormData(prev => ({
            ...prev,
            image_file: file,
            preview_url: URL.createObjectURL(file)
        }));
    };

    const fetchIngredients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/admin/ingredients', {
                params: { keyword: filters.keyword, unit: filters.unit, page: currentPage, limit: ITEMS_PER_PAGE }
            });
            if (res.data.success) {
                setIngredients(res.data.data.ingredients || []);
                setTotalPages(res.data.data.totalPages || 1);
            }
        } catch (error) {
            console.error(error);
            // 🎯 SỬA THÔNG BÁO LỖI FETCH DATA
            toast.error("Failed to fetch ingredients database", errorStyle);
        } finally {
            setLoading(false);
        }
    }, [filters.keyword, filters.unit, currentPage]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchIngredients(); }, 500);
        return () => clearTimeout(timer);
    }, [fetchIngredients]);

    useEffect(() => { setCurrentPage(1); }, [filters]);

    useEffect(() => {
        const fetchMicros = async () => {
            try {
                const res = await apiClient.get('/admin/micronutrients', { params: { limit: 1000 } });
                if (res.data && res.data.success) {
                    setAvailableMicros(res.data.data?.micronutrients || res.data.data || []);
                }
            } catch (err) { console.error('Failed to load micronutrients', err); }
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
            // 🎯 SỬA THÔNG BÁO LỖI ĐỊNH DẠNG EXCEL
            toast.error("Please upload an Excel file (.xlsx or .xls)", errorStyle);
            return;
        }
        const dataForm = new FormData();
        dataForm.append('file', file);
        try {
            setLoading(true);
            const res = await apiClient.post('/admin/ingredients/import', dataForm, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                // 🎯 SỬA THÔNG BÁO IMPORT THÀNH CÔNG
                toast.success(res.data.message || "Imported ingredients successfully!", successStyle);
                fetchIngredients(); 
            }
        } catch (error) {
            console.error(error);
            // 🎯 SỬA THÔNG BÁO IMPORT THẤT BẠI
            toast.error(error.response?.data?.message || "Failed to parse and import Excel file", errorStyle);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({ name: '', calories_per_unit: '', protein: '', carbs: '', fat: '', unit: 'gram', description: '', image_file: null, preview_url: '' });
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
                    protein: data.protein || 0,
                    carbs: data.carbs || 0,
                    fat: data.fat !== undefined ? data.fat : (data.fats || 0),
                    unit: data.unit || 'gram',
                    description: data.description || '',
                    image_file: null,
                    preview_url: data.image_url || '' 
                });
                const micros = (data.micronutrients || [])
                    .filter(m => m.micronutrientId)
                    .map(m => ({ 
                        micronutrientId: m.micronutrientId?._id || m.micronutrientId || m._id || m.id, 
                        amount: m.amount || 0
                    }));
                setSelectedMicros(micros);
            }
        } catch (error) {
            console.error(error);
            // 🎯 SỬA THÔNG BÁO LỖI TẢI FORM EDIT
            toast.error("Failed to load details data record", errorStyle);
        }
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this ingredient permanently?")) return;
        try {
            const res = await apiClient.delete(`/admin/ingredients/delete/${id}`);
            if (res.data.success) {
                // 🎯 SỬA THÔNG BÁO XÓA THÀNH CÔNG
                toast.success(res.data.message || "Deleted successfully!", successStyle);
                fetchIngredients();
            }
        } catch (error) { 
            // 🎯 SỬA THÔNG BÁO XÓA THẤT BẠI
            toast.error(error.response?.data?.message || "Error deleting selected ingredient", errorStyle); 
        }
    };

    const handleView = async (id) => {
        try {
            const res = await apiClient.get(`/admin/ingredients/${id}`);
            if (res.data && res.data.success) {
                setDetailData(res.data.data);
                setShowDetail(true);
            }
        } catch (error) { 
            // 🎯 SỬA THÔNG BÁO LỖI PROFILE CHI TIẾT
            toast.error('Failed to load ingredient details profile', errorStyle); 
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const cleanMicros = (selectedMicros || [])
                .filter(m => m && m.micronutrientId && m.micronutrientId.trim() !== '')
                .map(m => ({
                    micronutrientId: m.micronutrientId,
                    amount: Number(m.amount) || 0
                }));

            const dataForm = new FormData();
            dataForm.append('name', formData.name ? formData.name.trim() : '');
            dataForm.append('calories_per_unit', Number(formData.calories_per_unit) || 0);
            dataForm.append('protein', Number(formData.protein) || 0);
            dataForm.append('carbs', Number(formData.carbs) || 0);
            dataForm.append('fat', Number(formData.fat) || 0);
            dataForm.append('unit', formData.unit || 'gram');
            dataForm.append('description', formData.description ? formData.description.trim() : '');
            dataForm.append('micronutrients', JSON.stringify(cleanMicros));

            if (formData.image_file) {
                dataForm.append('imageFile', formData.image_file);
            }

            let res;
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (isEditing) {
                res = await apiClient.put(`/admin/ingredients/update/${currentId}`, dataForm, config);
            } else {
                res = await apiClient.post('/admin/ingredients/create', dataForm, config);
            }
            
            if (res.data && res.data.success) {
                // 🎯 SỬA THÔNG BÁO SUBMIT FORM (LƯU / TẠO) THÀNH CÔNG
                toast.success(res.data.message || "Saved successfully!", successStyle);
                setShowModal(false);
                fetchIngredients();
            }
        } catch (error) {
            console.error('Submit error:', error);
            // 🎯 SỬA THÔNG BÁO SUBMIT THẤT BẠI
            toast.error(error.response?.data?.message || "Action failed due to upload validation error", errorStyle);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-[var(--card-bg)] p-4 rounded-xl shadow-sm border border-[var(--border)] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text" placeholder="Search ingredients..."
                            value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                        />
                    </div>
                    <select
                        value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                    >
                        <option value="">All Units</option>
                        <option value="gram">gram</option>
                        <option value="ml">ml</option>
                        <option value="piece">piece</option>
                        <option value="cup">cup</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <AdminButton variant="secondary" onClick={() => fileInputRef.current.click()} title="Import ingredients from Excel template file">
                        <FileUp className="w-4 h-4" /> Import Excel
                    </AdminButton>
                    <AdminButton onClick={handleOpenCreate}>
                        <Plus className="w-4 h-4" /> Add Ingredient
                    </AdminButton>
                </div>
            </div>

            <DataTable 
                headers={["Ingredient", "Calories / Unit", "Macros (g)", "Actions"]}
                emptyState={
                    <tr>
                        <td colSpan="4" className="p-0">
                            {loading ? <LoadingState text="Loading ingredients..." /> : <EmptyState icon={PackageSearch} title="No ingredients found" description="Try adjusting your search filters or add a new ingredient." />}
                        </td>
                    </tr>
                }
            >
                {!loading && ingredients.map((item) => (
                    <DataTableRow key={item._id}>
                        <DataTableCell>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl overflow-hidden bg-[var(--bg-muted)] border border-[var(--border)] shrink-0 flex items-center justify-center">
                                    {item.image_url ? (
                                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <ImageIcon className="w-5 h-5 text-[var(--text-muted)]" />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-[var(--text-h)]">{item.name}</span>
                                    <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]" title={item.description}>{item.description || 'No description'}</span>
                                </div>
                            </div>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="flex flex-col">
                                <span className="font-bold text-[var(--primary)]">{item.calories_per_unit} kcal</span>
                                <span className="text-xs text-[var(--text-muted)]">per {item.unit}</span>
                            </div>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="flex gap-3 text-sm">
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-[var(--text-muted)] font-medium">Protein</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{item.protein}g</span>
                                </div>
                                <div className="flex flex-col items-center border-l border-r border-[var(--border)] px-3">
                                    <span className="text-xs text-[var(--text-muted)] font-medium">Carbs</span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">{item.carbs}g</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-[var(--text-muted)] font-medium">Fats</span>
                                    <span className="font-semibold text-red-500 dark:text-red-400">{item.fat || 0}g</span>
                                </div>
                            </div>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="flex items-center gap-2">
                                <AdminButton variant="ghost" size="sm" onClick={() => handleView(item._id)}>View</AdminButton>
                                <AdminButton variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="text-[var(--primary)]">
                                    <Edit className="w-4 h-4" />
                                </AdminButton>
                                <AdminButton variant="ghost" size="icon" onClick={() => handleDelete(item._id)} className="text-[var(--destructive)] hover:bg-red-50 dark:hover:bg-red-950">
                                    <Trash2 className="w-4 h-4" />
                                </AdminButton>
                            </div>
                        </DataTableCell>
                    </DataTableRow>
                ))}
            </DataTable>

            {!loading && ingredients.length > 0 && (
                <div className="flex items-center justify-between px-2 pb-6">
                    <span className="text-sm font-medium text-[var(--text-muted)]">Page {currentPage} of {totalPages}</span>
                    <div className="flex gap-2">
                        <AdminButton variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </AdminButton>
                        <AdminButton variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </AdminButton>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
                    <div className="bg-[var(--card-bg)] p-6 rounded-2xl w-[500px] max-h-[90vh] overflow-y-auto relative shadow-xl border border-[var(--border)]">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="mt-0 mb-6 text-xl font-bold text-[var(--text-h)]">{isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Ingredient Image</label>
                                <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                
                                <div 
                                    onClick={() => imageInputRef.current.click()}
                                    className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--bg-main)] transition-colors group"
                                >
                                    {formData.preview_url ? (
                                        <div className="relative w-full h-32 rounded-lg overflow-hidden">
                                            <img src={formData.preview_url} alt="Preview" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                                                Change Image
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors" />
                                            <span className="text-xs font-medium text-[var(--text-muted)]">Click to upload product photo (Max 5MB)</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Ingredient Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Calories / Unit</label>
                                    <input type="number" step="any" onKeyDown={blockInvalidChar} value={formData.calories_per_unit} onChange={e => handleNumberChange('calories_per_unit', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Unit</label>
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                        <option value="gram">gram</option>
                                        <option value="ml">ml</option>
                                        <option value="piece">piece</option>
                                        <option value="cup">cup</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Protein (g)</label>
                                    <input type="number" step="any" onKeyDown={blockInvalidChar} value={formData.protein} onChange={e => handleNumberChange('protein', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Carbs (g)</label>
                                    <input type="number" step="any" onKeyDown={blockInvalidChar} value={formData.carbs} onChange={e => handleNumberChange('carbs', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Fats (g)</label>
                                    <input type="number" step="any" onKeyDown={blockInvalidChar} value={formData.fat} onChange={e => handleNumberChange('fat', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" required />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Description</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"></textarea>
                            </div>

                            <div className="pt-2 border-t border-[var(--border)]">
                                <label className="block text-sm font-medium text-[var(--text-h)] mb-3">Micronutrients (optional)</label>
                                <div className="space-y-2 mb-3">
                                    {selectedMicros.map((m, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select
                                                value={m.micronutrientId || ''}
                                                onChange={e => {
                                                    const copy = [...selectedMicros];
                                                    copy[idx].micronutrientId = e.target.value;
                                                    setSelectedMicros(copy);
                                                }}
                                                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
                                            <input type="number" min="0" step="any" onKeyDown={blockInvalidChar} value={m.amount}
                                                onChange={e => {
                                                    const copy = [...selectedMicros];
                                                    copy[idx].amount = e.target.value;
                                                    setSelectedMicros(copy);
                                                }}
                                                placeholder="amount" className="w-24 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                                            <button type="button" onClick={() => { const copy = selectedMicros.filter((_, i) => i !== idx); setSelectedMicros(copy); }} className="p-2 text-[var(--destructive)] hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors cursor-pointer">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <AdminButton type="button" variant="outline" size="sm" onClick={() => setSelectedMicros([...selectedMicros, { micronutrientId: '', amount: '' }])} className="w-full border-dashed">
                                    <Plus className="w-4 h-4 mr-1" /> Add Micronutrient
                                </AdminButton>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-[var(--border)]">
                                <AdminButton type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</AdminButton>
                                <AdminButton type="submit">{isEditing ? 'Save Changes' : 'Create Ingredient'}</AdminButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetail && detailData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1100] p-4">
                    <div className="bg-[var(--card-bg)] p-6 rounded-2xl w-[520px] max-h-[90vh] overflow-y-auto relative shadow-xl border border-[var(--border)]">
                        <button onClick={() => { setShowDetail(false); setDetailData(null); }} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h3 className="mt-0 mb-4 text-xl font-bold text-[var(--text-h)]">{detailData.name}</h3>
                        
                        <div className="space-y-4 text-sm text-[var(--text-main)]">
                            <div className="flex gap-4">
                                <div className="bg-[var(--bg-muted)] px-3 py-2 rounded-lg flex-1">
                                    <span className="block text-xs text-[var(--text-muted)] mb-1">Unit</span>
                                    <span className="font-semibold">{detailData.unit}</span>
                                </div>
                                <div className="bg-[var(--bg-muted)] px-3 py-2 rounded-lg flex-1">
                                    <span className="block text-xs text-[var(--text-muted)] mb-1">Calories / Unit</span>
                                    <span className="font-semibold text-[var(--primary)]">{detailData.calories_per_unit} kcal</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg flex-1">
                                    <span className="block text-xs opacity-70 mb-1">Protein</span>
                                    <span className="font-bold">{detailData.protein}g</span>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg flex-1">
                                    <span className="block text-xs opacity-70 mb-1">Carbs</span>
                                    <span className="font-bold">{detailData.carbs}g</span>
                                </div>
                                <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg flex-1">
                                    <span className="block text-xs opacity-70 mb-1">Fats</span>
                                    <span className="font-bold">{detailData.fat || 0}g</span>
                                </div>
                            </div>
                            
                            {detailData.description && (
                                <div className="bg-[var(--bg-muted)] p-3 rounded-lg border border-[var(--border)]">
                                    <strong className="block text-xs text-[var(--text-muted)] mb-1">Description</strong>
                                    <p className="whitespace-pre-wrap">{detailData.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <h4 className="text-sm font-bold text-[var(--text-h)] border-b border-[var(--border)] pb-2 mb-3">Micronutrients Profile</h4>
                            {detailData.micronutrients && detailData.micronutrients.length ? (
                                <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-[var(--bg-muted)]">
                                            <tr>
                                                <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">Name</th>
                                                <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">Amount</th>
                                                <th className="px-4 py-2 font-semibold text-[var(--text-muted)]">Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {detailData.micronutrients.map((m, i) => (
                                                <tr key={i} className="bg-[var(--card-bg)] hover:bg-[var(--bg-muted)]/50 transition-colors">
                                                    <td className="px-4 py-2 font-medium">{m.micronutrientId?.name || m.name || m.micronutrientId}</td>
                                                    <td className="px-4 py-2 font-bold text-[var(--primary)]">{m.amount}</td>
                                                    <td className="px-4 py-2 text-[var(--text-muted)]">{m.micronutrientId?.unit || m.unit || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-muted)] italic bg-[var(--bg-muted)] p-3 rounded-lg text-center">No micronutrients linked.</p>
                            )}
                        </div>

                        <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border)]">
                            <AdminButton variant="secondary" onClick={() => { setShowDetail(false); setDetailData(null); }}>Close</AdminButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientPage;
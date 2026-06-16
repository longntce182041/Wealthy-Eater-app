import { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import apiClient from '../../services/api'; 
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

// ==========================================
// COMPONENT SUB-FORM
// ==========================================
const MicronutrientForm = ({ initialData, unitOptions = [], onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState(initialData || { name: '', unit: 'mg', description: '' });
    const [loading, setLoading] = useState(false);

    const normalizedUnitOptions = Array.from(
        new Set([...unitOptions, formData.unit].filter(Boolean))
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) {
            toast.error("Name is required");
            return;
        }

        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onCancel}
            title={isEditing ? 'Edit Micronutrient' : 'Add New Micronutrient'}
            footer={
                <>
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="micronutrientForm"
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
                    </button>
                </>
            }
        >
            <form id="micronutrientForm" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Micronutrient Name *</label>
                        <input 
                            type="text" 
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                            placeholder="e.g., Vitamin C, Iron"
                            required 
                            disabled={loading}
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Unit *</label>
                        <select 
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
                            value={formData.unit} 
                            onChange={e => setFormData({ ...formData, unit: e.target.value })} 
                            disabled={loading}
                        >
                            <option value="">Select unit</option>
                            {normalizedUnitOptions.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-slate-700">Description</label>
                        <textarea 
                            rows="3" 
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            value={formData.description} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Enter description (optional)"
                            disabled={loading}
                        ></textarea>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

// ==========================================
// COMPONENT CHÍNH
// ==========================================
const MicronutrientList = () => {
    const defaultUnitOptions = ['mcg', 'mg', 'g', 'IU', '%', 'kcal'];
    const [micronutrients, setMicronutrients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const ITEMS_PER_PAGE = 12;

    const [filters, setFilters] = useState({ keyword: '', unit: '' });

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({ name: '', unit: 'mg', description: '' });

    const fetchMicronutrients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/admin/micronutrients', {
                params: {
                    keyword: filters.keyword,
                    unit: filters.unit,
                    page: currentPage,
                    limit: ITEMS_PER_PAGE
                }
            });
            
            if (res.data && res.data.success) {
                const backendData = res.data.data;
                const dataList = backendData?.micronutrients || backendData?.docs || [];
                setMicronutrients(dataList);
                setTotalPages(backendData?.totalPages || 1);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }, [filters.keyword, filters.unit, currentPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMicronutrients();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchMicronutrients]);



    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };

    const availableUnits = Array.from(new Set([
        ...defaultUnitOptions,
        ...micronutrients.map((m) => m?.unit).filter(Boolean)
    ]));

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({ name: '', unit: 'mg', description: '' });
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setIsEditing(true);
        setCurrentId(item._id);
        setFormData({
            name: item.name || '',
            unit: item.unit || 'mg',
            description: item.description || ''
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (data) => {
        try {
            let res;
            if (isEditing) {
                res = await apiClient.put(`/admin/micronutrients/update/${currentId}`, data);
            } else {
                res = await apiClient.post('/admin/micronutrients/create', data);
            }
            toast.success(res.data.message || "Action successfully performed");
            setShowModal(false);
            fetchMicronutrients();
        } catch (err) {
            toast.error(err.response?.data?.message || "Action failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this micronutrient?")) return;
        try {
            const res = await apiClient.delete(`/admin/micronutrients/delete/${id}`);
            toast.success(res.data.message || "Deleted successfully");
            fetchMicronutrients();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error deleting");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900">Micronutrients Management</h2>
            </div>

            {/* --- TOOLBAR --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text" 
                            className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            placeholder="Search micronutrients..."
                            value={filters.keyword} 
                            onChange={(e) => {
                                setFilters({ ...filters, keyword: e.target.value });
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    
                    <div className="relative w-full sm:w-48">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Filter size={16} />
                        </div>
                        <select
                            className="block w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors appearance-none"
                            value={filters.unit}
                            onChange={(e) => {
                                setFilters({ ...filters, unit: e.target.value });
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">All Units</option>
                            {availableUnits.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-auto shrink-0">
                    <button onClick={handleOpenCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20">
                        <Plus size={18} /> Add Micronutrient
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
                    {micronutrients.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center">
                            <p className="font-medium text-sm">No micronutrients found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {micronutrients.map((item) => (
                                <div key={item._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                                    <div className="flex-1 flex flex-col cursor-pointer" onClick={() => handleOpenEdit(item)}>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
                                            {item.name}
                                        </h3>
                                        <div className="text-sm text-slate-500 mb-3">
                                            Unit: <strong className="text-emerald-600">{item.unit}</strong>
                                        </div>
                                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed mt-auto">
                                            {item.description || <span className="italic text-slate-400">No description available.</span>}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-end gap-1">
                                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(item._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- PAGINATION --- */}
                    {micronutrients.length > 0 && (
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPrevPage={handlePrevPage} 
                            onNextPage={handleNextPage} 
                        />
                    )}
                </>
            )}

            {/* MODAL FORM */}
            {showModal && (
                <MicronutrientForm
                    initialData={isEditing ? formData : null}
                    unitOptions={availableUnits}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowModal(false)}
                    isEditing={isEditing}
                />
            )}
        </div>
    );
};

export default MicronutrientList;
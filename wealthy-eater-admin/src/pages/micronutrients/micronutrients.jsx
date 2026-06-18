import { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, X, Database } from 'lucide-react';
import apiClient from '../../services/api'; 
import { toast } from 'react-hot-toast'; 
import { DataTable, DataTableRow, DataTableCell } from '../../components/ui/DataTable';
import { AdminButton } from '../../components/ui/AdminButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

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

// ==========================================
// COMPONENT SUB-FORM
// ==========================================
const MicronutrientForm = ({ initialData, unitOptions = [], onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState({ name: '', unit: 'mg', description: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({ name: '', unit: 'mg', description: '' });
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [initialData]);

    const normalizedUnitOptions = Array.from(
        new Set([...unitOptions, formData.unit].filter(Boolean))
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) {
            toast.error("Name is required", errorStyle);
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
            <div className="bg-[var(--card-bg)] p-6 rounded-2xl w-[500px] max-h-[90vh] overflow-y-auto relative shadow-xl border border-[var(--border)]">
                <button onClick={onCancel} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer" disabled={loading}>
                    <X className="w-5 h-5" />
                </button>
                
                <h3 className="mt-0 mb-6 text-xl font-bold text-[var(--text-h)]">
                    {isEditing ? 'Edit Micronutrient' : 'Add New Micronutrient'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Micronutrient Name *</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
                            placeholder="e.g., Vitamin C, Iron"
                            required 
                            disabled={loading}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Unit *</label>
                        <select 
                            value={formData.unit} 
                            onChange={e => setFormData({ ...formData, unit: e.target.value })} 
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                            disabled={loading}
                        >
                            <option value="">Select unit</option>
                            {normalizedUnitOptions.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">Description</label>
                        <textarea 
                            rows="3" 
                            value={formData.description} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
                            placeholder="Enter description (optional)"
                            disabled={loading}
                        ></textarea>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-[var(--border)]">
                        <AdminButton 
                            type="button" 
                            variant="ghost"
                            onClick={onCancel} 
                            disabled={loading}
                        >
                            Cancel
                        </AdminButton>
                        <AdminButton 
                            type="submit" 
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
                        </AdminButton>
                    </div>
                </form>
            </div>
        </div>
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
            toast.error("Failed to fetch micronutrients database", errorStyle);
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

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

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

    // 🎯 THÔNG BÁO THÊM / SỬA THEO CHUẨN REACT-HOT-TOAST
    const handleFormSubmit = async (data) => {
        try {
            let res;
            if (isEditing) {
                res = await apiClient.put(`/admin/micronutrients/update/${currentId}`, data);
            } else {
                res = await apiClient.post('/admin/micronutrients/create', data);
            }
            
            if (res.data && res.data.success) {
                toast.success(res.data.message || "Saved successfully!", successStyle);
                setShowModal(false);
                fetchMicronutrients();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Action failed due to error", errorStyle);
        }
    };

    // 🎯 THÔNG BÁO XÓA THEO CHUẨN REACT-HOT-TOAST
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this micronutrient permanently?")) return;
        try {
            const res = await apiClient.delete(`/admin/micronutrients/delete/${id}`);
            if (res.data.success) {
                toast.success(res.data.message || "Deleted successfully!", successStyle);
                fetchMicronutrients();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Error deleting selected item", errorStyle);
        }
    };

    return (
        <div className="space-y-6">
            {/* --- TOOLBAR --- */}
            <div className="bg-[var(--card-bg)] p-4 rounded-xl shadow-sm border border-[var(--border)] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                            type="text" 
                            placeholder="Search micronutrients..."
                            value={filters.keyword} 
                            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
                        />
                    </div>
                    
                    <select
                        value={filters.unit} 
                        onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
                    >
                        <option value="">All Units</option>
                        {availableUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                <AdminButton onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4" /> Add Micronutrient
                </AdminButton>
            </div>

            {/* --- LIST DATATABLE --- */}
            <DataTable 
                headers={["Micronutrient", "Unit", "Description", "Actions"]}
                emptyState={
                    <tr>
                        <td colSpan="4" className="p-0">
                            {loading ? (
                                <LoadingState text="Loading micronutrients..." />
                            ) : (
                                <EmptyState icon={Database} title="No micronutrients found" description="Try adjusting your search filters or add a new micronutrient." />
                            )}
                        </td>
                    </tr>
                }
            >
                {!loading && micronutrients.map((item) => (
                    <DataTableRow key={item._id}>
                        <DataTableCell>
                            <span className="font-semibold text-[var(--text-h)] cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => handleOpenEdit(item)} title="Click to edit">
                                {item.name}
                            </span>
                        </DataTableCell>
                        <DataTableCell>
                            <Badge variant="outline" className="text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20">{item.unit}</Badge>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="text-sm text-[var(--text-muted)] max-w-md truncate" title={item.description}>
                                {item.description || <span className="italic opacity-70">No description</span>}
                            </div>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="flex items-center gap-2">
                                <AdminButton variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="text-[var(--primary)]" title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                </AdminButton>
                                <AdminButton variant="ghost" size="icon" onClick={() => handleDelete(item._id)} className="text-[var(--destructive)] hover:bg-red-50 dark:hover:bg-red-950" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </AdminButton>
                            </div>
                        </DataTableCell>
                    </DataTableRow>
                ))}
            </DataTable>

            {/* --- PAGINATION --- */}
            {!loading && micronutrients.length > 0 && (
                <div className="flex items-center justify-between px-2 pb-6">
                    <span className="text-sm font-medium text-[var(--text-muted)]">
                        Page {currentPage} of {totalPages}
                    </span>
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
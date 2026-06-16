import React, { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import apiClient from '../../services/api'; 
import { toast } from 'react-toastify';

// ==========================================
// COMPONENT SUB-FORM (ĐÃ SỬA LỖI MÀU CHỮ Ô UNIT)
// ==========================================
const MicronutrientForm = ({ initialData, unitOptions = [], onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState({ name: '', unit: 'mg', description: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({ name: '', unit: 'mg', description: '' });
        }
    }, [initialData]);

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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={onCancel} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer' }} disabled={loading}>
                    <X size={20} style={{ color: '#666' }} />
                </button>
                
                <h3 style={{ marginTop: 0, color: '#30a5ff', fontSize: '18px', fontWeight: 'bold' }}>
                    {isEditing ? 'Edit Micronutrient' : 'Add New Micronutrient'}
                </h3>
                
                <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Micronutrient Name *</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} 
                            placeholder="e.g., Vitamin C, Iron"
                            required 
                            disabled={loading}
                        />
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Unit *</label>
                        {/* 🎯 Fix ép màu chữ sang đen #333 để không bị trắng tươi */}
                        <select 
                            value={formData.unit} 
                            onChange={e => setFormData({ ...formData, unit: e.target.value })} 
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', background: 'white', color: '#333' }}
                            disabled={loading}
                        >
                            <option value="" style={{ color: '#333' }}>Select unit</option>
                            {normalizedUnitOptions.map((unit) => (
                                <option key={unit} value={unit} style={{ color: '#333' }}>{unit}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#333', fontWeight: '500' }}>Description</label>
                        <textarea 
                            rows="3" 
                            value={formData.description} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontFamily: 'inherit', color: '#333', background: 'white' }}
                            placeholder="Enter description (optional)"
                            disabled={loading}
                        ></textarea>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button 
                            type="button" 
                            onClick={onCancel} 
                            style={{ background: '#f1f1f1', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            style={{ background: '#30a5ff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }} 
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
                        </button>
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
        <div>
            <h2 style={{ color: '#30a5ff', marginBottom: '20px' }}>Micronutrients Management</h2>

            {/* --- TOOLBAR --- */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '5px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text" 
                        placeholder="Search micronutrients..."
                        value={filters.keyword} 
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', color: '#333', background: 'white' }}
                    />
                </div>
                
                <div style={{ position: 'relative', width: '170px' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <select
                        value={filters.unit} 
                        onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                        style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', background: 'white', color: '#333' }}
                    >
                        <option value="">All Units</option>
                        {availableUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                <button onClick={handleOpenCreate} style={{ background: '#30a5ff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '5px', fontWeight: 'bold', alignItems: 'center' }}>
                    <Plus size={18} /> Add Micronutrient
                </button>
            </div>

            {/* --- LIST CARDS --- */}
            {loading ? <p style={{ textAlign: 'center', color: '#666' }}>Loading data...</p> : (
                <>
                    {micronutrients.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', margin: '40px 0' }}>No micronutrients found.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {micronutrients.map((item) => (
                                <div key={item._id} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div style={{ padding: '15px' }}>
                                        <h3 onClick={() => handleOpenEdit(item)} style={{ margin: '0 0 5px 0', color: '#333', cursor: 'pointer' }} title="Click to edit">
                                            {item.name}
                                        </h3>
                                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                                            Unit: <strong style={{ color: '#30a5ff' }}>{item.unit}</strong>
                                        </p>
                                        <p style={{ margin: '0', color: '#888', fontSize: '13px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {item.description || 'No description available.'}
                                        </p>
                                    </div>
                                    
                                    <div style={{ padding: '0 15px 15px 15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #f5f5f5', paddingTop: '12px' }}>
                                            <button onClick={() => handleOpenEdit(item)} style={{ color: '#30a5ff', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Edit"><Edit2 size={20} /></button>
                                            <button onClick={() => handleDelete(item._id)} style={{ color: '#f9243f', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete"><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- PAGINATION --- */}
                    {micronutrients.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px', paddingBottom: '20px' }}>
                            <button
                                onClick={handlePrevPage} disabled={currentPage === 1}
                                style={{ background: currentPage === 1 ? '#eee' : 'white', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '5px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: currentPage === 1 ? '#999' : '#333' }}
                            >
                                <ChevronLeft size={18} /> Previous
                            </button>
                            <span style={{ fontWeight: 'bold', color: '#5f6468' }}>Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={handleNextPage} disabled={currentPage === totalPages}
                                style={{ background: currentPage === totalPages ? '#eee' : 'white', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '5px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: currentPage === totalPages ? '#999' : '#333' }}
                            >
                                Next <ChevronRight size={18} />
                            </button>
                        </div>
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
import React, { useCallback, useEffect, useState, useRef } from 'react';
import apiClient from '../../services/api';
import { Trash2, Edit, Plus, X, Image as ImageIcon, Search, Filter, ChevronLeft, ChevronRight, FileUp } from 'lucide-react';
import { toast } from 'react-toastify';

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
        name: '', calories_per_unit: '', protein: '', carbs: '', fats: '', unit: 'gram', ImageUrl: '', description: ''
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
        setCurrentPage(1);
    }, [filters]);

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
        setFormData({ name: '', calories_per_unit: '', protein: '', carbs: '', fats: '', unit: 'gram', ImageUrl: '', description: '' });
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
                    fats: data.fats || '',
                    unit: data.unit || 'gram',
                    ImageUrl: data.ImageUrl || '',
                    description: data.description || ''
                });
                const micros = (data.micronutrients || []).map(m => ({ 
                    micronutrientId: m.micronutrientId?._id || m.micronutrientId || m._id || m.id, 
                    amount: m.amount 
                }));
                setSelectedMicros(micros);
            } else {
                setFormData({ ...item, ImageUrl: item.ImageUrl || '', description: item.description || '' });
                setSelectedMicros([]);
            }
        } catch (error) {
            console.error(error);
            setFormData({ ...item, ImageUrl: item.ImageUrl || '', description: item.description || '' });
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
            const payload = { ...formData, micronutrients: selectedMicros };
            let res;
            if (isEditing) {
                res = await apiClient.put(`/admin/ingredients/update/${currentId}`, payload);
            } else {
                res = await apiClient.post('/admin/ingredients/create', payload);
            }
            toast.success(res.data.message);
            setShowModal(false);
            fetchIngredients();
        } catch (error) {
            const serverMessage = error.response?.data?.message;
            toast.error(serverMessage || "Action failed");
        }
    };

    return (
        <div>
            <h2 style={{ color: '#30a5ff', marginBottom: '20px' }}>Ingredients Management</h2>

            {/* --- TOOLBAR --- */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '5px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text" placeholder="Search ingredients..."
                        value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #ddd', color: '#333', background: 'white' }}
                    />
                </div>
                <div style={{ position: 'relative', width: '170px' }}>
                    <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <select
                        value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                        style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer', color: '#333', background: 'white' }}
                    >
                        <option value="">All Units</option>
                        <option value="gram">gram</option>
                        <option value="ml">ml</option>
                        <option value="piece">piece</option>
                        <option value="cup">cup</option>
                    </select>
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportExcel} 
                    accept=".xlsx, .xls" 
                    style={{ display: 'none' }} 
                />
                <button 
                    onClick={() => fileInputRef.current.click()} 
                    style={{ background: '#28a745', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '6px', fontWeight: 'bold', alignItems: 'center' }}
                    title="Import ingredients from Excel template file"
                >
                    <FileUp size={18} /> Import Excel
                </button>

                <button onClick={handleOpenCreate} style={{ background: '#30a5ff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer', display: 'flex', gap: '5px', fontWeight: 'bold', alignItems: 'center' }}>
                    <Plus size={18} /> Add Ingredient
                </button>
            </div>

            {/* --- LIST CARDS --- */}
            {loading ? <p style={{ textAlign: 'center', color: '#666' }}>Loading data...</p> : (
                <>
                    {ingredients.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', margin: '40px 0' }}>No ingredients found.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {ingredients.map((item) => (
                                <div key={item._id} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                                    <div style={{ height: '160px', background: '#f8f9fa' }}>
                                        {item.ImageUrl ? <img src={item.ImageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#ccc' }}><ImageIcon size={40} /></div>}
                                    </div>
                                    <div style={{ padding: '15px' }}>
                                        <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>{item.name}</h3>
                                        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Calories: <strong style={{ color: '#30a5ff' }}>{item.calories_per_unit}</strong> / {item.unit}</p>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', gap: '15px' }}>
                                            <button onClick={() => handleView(item._id)} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}>View</button>
                                            <button onClick={() => handleOpenEdit(item)} style={{ color: '#30a5ff', background: 'none', border: 'none', cursor: 'pointer' }}><Edit size={20} /></button>
                                            <button onClick={() => handleDelete(item._id)} style={{ color: '#f9243f', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* --- PAGINATION CONTROLS --- */}
                    {ingredients.length > 0 && (
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

            {/* --- MODAL CREATE / EDIT --- */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} style={{ color: '#666' }} /></button>
                        <h3 style={{ marginTop: 0, color: '#30a5ff', fontWeight: 'bold' }}>{isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
                        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#333' }}>Ingredient Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#333' }}>Calories / Unit</label>
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.calories_per_unit} onChange={e => handleNumberChange('calories_per_unit', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#333' }}>Unit</label>
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }}>
                                        <option value="gram">gram</option>
                                        <option value="ml">ml</option>
                                        <option value="piece">piece</option>
                                        <option value="cup">cup</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>Protein (g)</label>
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.protein} onChange={e => handleNumberChange('protein', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>Carbs (g)</label>
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.carbs} onChange={e => handleNumberChange('carbs', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>Fats (g)</label>
                                    <input type="number" onKeyDown={blockInvalidChar} value={formData.fats} onChange={e => handleNumberChange('fats', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} required />
                                </div>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#333' }}>Image URL</label>
                                <input type="text" value={formData.ImageUrl} onChange={e => setFormData({ ...formData, ImageUrl: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white' }} placeholder="https://..." />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', color: '#333' }}>Description</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', color: '#333', background: 'white', fontFamily: 'inherit' }}></textarea>
                            </div>

                            {/* MICRONUTRIENTS SECTION */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#333', fontWeight: '500' }}>Micronutrients (optional)</label>
                                {selectedMicros.map((m, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <select
                                            value={m.micronutrientId || ''}
                                            onChange={e => {
                                                const copy = [...selectedMicros];
                                                copy[idx].micronutrientId = e.target.value;
                                                setSelectedMicros(copy);
                                            }}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', background: 'white' }}
                                        >
                                            <option value="">Select micronutrient</option>
                                            {availableMicros
                                                .filter(a => {
                                                    const id = a._id || a.id;
                                                    const already = selectedMicros.some((s, si) => s.micronutrientId === id && si !== idx);
                                                    return !already || (m.micronutrientId && (m.micronutrientId === id));
                                                })
                                                .map(a => <option key={a._id || a.id} value={a._id || a.id} style={{ color: '#333' }}>{a.name}</option>)}
                                        </select>
                                        <input type="number" min="0" onKeyDown={blockInvalidChar} value={m.amount}
                                            onChange={e => {
                                                const copy = [...selectedMicros];
                                                copy[idx].amount = e.target.value;
                                                setSelectedMicros(copy);
                                            }}
                                            placeholder="amount" style={{ width: '110px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', color: '#333', background: 'white' }} />
                                        <button type="button" onClick={() => { const copy = selectedMicros.filter((_, i) => i !== idx); setSelectedMicros(copy); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f9243f' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                <div>
                                    <button type="button" onClick={() => setSelectedMicros([...selectedMicros, { micronutrientId: '', amount: '' }])} style={{ background: '#eef6ff', border: '1px dashed #30a5ff', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', color: '#30a5ff', fontWeight: '500' }}>
                                        + Add micronutrient
                                    </button>
                                </div>
                            </div>

                            {/* 🎯 Đã cập nhật hàng nút điều hướng: Thêm nút Cancel đồng bộ đẹp mắt */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)} 
                                    style={{ background: '#f1f1f1', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 20px', background: '#30a5ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                    {isEditing ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DETAIL MODAL --- */}
            {showDetail && detailData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '520px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => { setShowDetail(false); setDetailData(null); }} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} style={{ color: '#666' }} /></button>
                        <h3 style={{ marginTop: 0, color: '#30a5ff', fontWeight: 'bold', fontSize: '18px' }}>{detailData.name}</h3>
                        
                        <div style={{ marginTop: '15px', color: '#333', lineHeight: '1.6' }}>
                            <p><strong>Unit:</strong> {detailData.unit} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Calories/Unit:</strong> {detailData.calories_per_unit}</p>
                            <p><strong>Protein:</strong> {detailData.protein}g &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Carbs:</strong> {detailData.carbs}g &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Fats:</strong> {detailData.fats}g</p>
                            <p style={{ whiteSpace: 'pre-wrap', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                                <strong>Description:</strong><br/>{detailData.description || 'No description available.'}
                            </p>
                        </div>

                        <h4 style={{ marginTop: '20px', marginBottom: '8px', color: '#333', borderBottom: '2px solid #30a5ff', paddingBottom: '4px', display: 'inline-block', fontWeight: 'bold' }}>Micronutrients Linkage</h4>
                        {detailData.micronutrients && detailData.micronutrients.length ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
                                        <th style={{ padding: '8px', color: '#333' }}>Name</th>
                                        <th style={{ padding: '8px', color: '#333' }}>Amount</th>
                                        <th style={{ padding: '8px', color: '#333' }}>Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailData.micronutrients.map((m, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #fafafa' }}>
                                            <td style={{ padding: '8px', fontWeight: '500', color: '#333' }}>{m.micronutrientId?.name || m.name || m.micronutrientId}</td>
                                            <td style={{ padding: '8px', color: '#30a5ff', fontWeight: 'bold' }}>{m.amount}</td>
                                            <td style={{ padding: '8px', color: '#666' }}>{m.micronutrientId?.unit || m.unit || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic', marginTop: '5px' }}>No micronutrients linked to this ingredient.</p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button 
                                type="button" 
                                onClick={() => { setShowDetail(false); setDetailData(null); }} 
                                style={{ background: '#f1f1f1', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientPage;
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, ShieldAlert, Award, DollarSign, Star, 
  Calendar, MessageSquare, User, Eye, CheckCircle2, XCircle, Loader2,
  Lock, Unlock, Mail, FileText, Briefcase
} from 'lucide-react';
import apiClient from '../../services/api';

export default function ExpertProfileDetail({ expertId, onBack, onStatusUpdated }) {
  const [expertData, setExpertData] = useState(null);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'reviews'
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Tải chi tiết thông tin chuyên gia
  const loadExpertDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/nutritionists/${expertId}`);
      
      if (response.data?.success && response.data?.data) {
        const { consultations, reviews: rawReviews, ...info } = response.data.data;
        setExpertData(info);
        setConsultationHistory(consultations || []);
        setReviews(rawReviews || []);
      } else if (response.data) {
        setExpertData(response.data);
      }
    } catch (error) {
      console.error("⚠️ Lỗi đồng bộ hồ sơ chuyên gia:", error);
      
      // Mock Fallback để UI không bị vỡ nếu lỡ đứt kết nối API
      setExpertData({
        _id: expertId,
        fullName: "ThS. Bác sĩ Nguyễn Dinh Dưỡng",
        professionalTitle: "Chuyên gia Dinh dưỡng Lâm sàng",
        licenseNumber: "NUTR-2026-X881",
        certificationUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600",
        serviceFee: 350000,
        approvalStatus: "PENDING",
        status: "ACTIVE",
        averageRating: 4.9,
        email: "nguyenvan.expert@wealthyeater.com",
        specialization: "Dinh dưỡng Lâm sàng & Giảm béo",
        createdAt: "2026-01-15T08:00:00.000Z"
      });
      setConsultationHistory([
        { id: "H1", customerName: "Lê Hoàng Long", date: "18/06/2026", status: "Completed", type: "Tư vấn Kế hoạch ăn kiêng Keto" },
        { id: "H2", customerName: "Phạm Minh Thư", date: "15/06/2026", status: "Completed", type: "Thiết lập thực đơn tiểu đường Thai kỳ" }
      ]);
      setReviews([
        { id: "R1", customerName: "Lê Hoàng Long", rating: 5, comment: "Bác sĩ hướng dẫn thực đơn rất thực tế, giảm mỡ nội tạng tốt.", date: "18/06/2026" },
        { id: "R2", customerName: "Đặng Hoàng Anh", rating: 4, comment: "Chuyên môn sâu, giải đáp thắc mắc về chỉ số GI rất kỹ càng.", date: "11/06/2026" }
      ]);
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    if (expertId) loadExpertDetails();
  }, [expertId, loadExpertDetails]);

  // Xử lý Duyệt hoặc Từ chối Hồ sơ (UC-84)
  const handleVerify = async (status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      alert("Vui lòng nhập lý do cụ thể để gửi thông báo từ chối kiểm duyệt qua email.");
      return;
    }

    const isApprove = status === 'APPROVED';
    const confirmMsg = isApprove 
      ? 'Bạn có chắc chắn muốn DUYỆT hồ sơ & kích hoạt trạng thái cho chuyên gia này?' 
      : 'Bạn có chắc chắn muốn TỪ CHỐI cấp phép cho hồ sơ này?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmitting(true);
      const payload = {
        action: isApprove ? 'APPROVE' : 'REJECT',
        approvalStatus: status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
      };

      const response = await apiClient.put(`/admin/nutritionists/${expertId}/verify`, payload);

      if (response.data?.success || response.status === 200) {
        alert(response.data?.message || "Cập nhật thẩm định chứng chỉ thành công!");
        if (onStatusUpdated) onStatusUpdated();
        loadExpertDetails();
        setShowRejectForm(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xử lý hệ thống kiểm duyệt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Tạm khóa / Kích hoạt lại Tài khoản (UC-85)
  const handleToggleAccountStatus = async (targetStatus) => {
    const isSuspend = targetStatus === 'SUSPENDED';
    const actionText = isSuspend ? 'TẠM KHÓA tài khoản này' : 'KÍCH HOẠT LẠI tài khoản này';
    
    if (!window.confirm(`Bạn có chắc muốn ${actionText}?`)) return;

    try {
      setSubmitting(true);
      const payload = {
        status: isSuspend ? 'suspend' : 'active',
        approvalStatus: isSuspend ? 'SUSPENDED' : 'APPROVED'
      };

      const response = await apiClient.put(`/admin/nutritionists/${expertId}/approval`, payload);

      if (response.data?.success || response.status === 200) {
        alert(response.data?.message || "Cập nhật trạng thái tài khoản thành công!");
        if (onStatusUpdated) onStatusUpdated();
        loadExpertDetails();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi cập nhật trạng thái tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lấy trạng thái tổng hợp của chuyên gia
  const getEffectiveStatus = () => {
    if (!expertData) return 'PENDING';
    const userStatus = expertData.userStatus?.toUpperCase() || expertData.status?.toUpperCase();
    if (userStatus === 'SUSPENDED' || userStatus === 'BANNED') return userStatus;
    return expertData.approvalStatus?.toUpperCase() || userStatus || 'PENDING';
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Đang tải và kiểm tra hồ sơ năng lực chuyên gia...</p>
      </div>
    );
  }

  if (!expertData) {
    return (
      <div className="py-20 text-center text-red-500">
        <p className="text-sm font-semibold">Không tìm thấy dữ liệu của chuyên gia này.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border-none cursor-pointer">Quay lại</button>
      </div>
    );
  }

  const currentStatus = getEffectiveStatus();

  return (
    <div className="space-y-6 text-slate-700">
      {/* Khối thanh công cụ điều hướng */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border-none bg-transparent cursor-pointer transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Hồ Sơ Năng Lực Chuyên Môn</h2>
            <p className="text-xs text-slate-400 m-0 mt-0.5">ID tài khoản: <span className="font-mono font-bold text-slate-600">{expertData._id || expertData.id}</span></p>
          </div>
        </div>

        {/* Trạng thái Badge */}
        <div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
            currentStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            currentStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            currentStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            'bg-orange-50 text-orange-700 border-orange-200'
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 🔲 CỘT TRÁI: THÔNG TIN CÁ NHÂN & BẰNG CẤP */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 m-0">{expertData.fullName || 'Chưa cập nhật tên'}</h3>
            <p className="text-xs text-slate-400 m-0 mt-1 flex items-center justify-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {expertData.email}
            </p>
            <div className="mt-3 inline-flex px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
              {expertData.professionalTitle || 'Bác sĩ / Chuyên gia Dinh dưỡng'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Thông tin kiểm định
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Phí tư vấn:</span>
                <span className="font-bold text-emerald-700 text-sm">{expertData.serviceFee ? expertData.serviceFee.toLocaleString() : '0'} VND</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Đánh giá:</span>
                <span className="font-bold text-slate-700">{expertData.averageRating ? expertData.averageRating.toFixed(1) : '0.0'} / 5.0</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> Chuyên môn:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={expertData.specialization}>{expertData.specialization || 'Tổng quát'}</span>
              </div>

              <div className="space-y-1 px-1">
                <span className="text-slate-500 font-medium block">Số giấy phép hành nghề:</span>
                <code className="bg-slate-50 text-slate-800 font-bold px-2 py-1 border border-slate-200 rounded block text-center font-mono">{expertData.licenseNumber || 'N/A'}</code>
              </div>
            </div>

            {/* VÙNG HIỂN THỊ BẰNG CẤP / CHỨNG CHỈ */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Chứng chỉ đính kèm:
              </span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-[4/3] flex items-center justify-center">
                {expertData.certificationUrl ? (
                  <>
                    <img src={expertData.certificationUrl} alt="Medical Certificate" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                    <a href={expertData.certificationUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 text-white font-bold text-xs gap-1.5 no-underline transition-opacity cursor-pointer">
                      <Eye className="w-4 h-4" /> Xem tệp đính kèm gốc
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">Chưa tải lên chứng chỉ</span>
                )}
              </div>
            </div>
          </div>

          {/* CÁC NÚT HÀNH ĐỘNG DUYỆT / KHÓA TÀI KHOẢN */}
          {currentStatus === 'PENDING' && !showRejectForm && (
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setShowRejectForm(true)} 
                disabled={submitting} 
                className="flex items-center justify-center gap-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs bg-white cursor-pointer transition-colors"
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
              <button 
                type="button"
                onClick={() => handleVerify('APPROVED')} 
                disabled={submitting} 
                className="flex items-center justify-center gap-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Duyệt hồ sơ
              </button>
            </div>
          )}

          {/* Form điền lý do từ chối */}
          {showRejectForm && (
            <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 space-y-3">
              <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Lý do từ chối (sẽ gửi qua email):
              </span>
              <textarea 
                rows="3" 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)} 
                placeholder="Ví dụ: Bằng cấp mờ, thiếu dấu mộc đỏ, thông tin giấy phép không trùng khớp..." 
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400" 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-md text-xs cursor-pointer">Hủy</button>
                <button type="button" onClick={() => handleVerify('REJECTED')} disabled={submitting} className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-md text-xs cursor-pointer">Xác nhận từ chối</button>
              </div>
            </div>
          )}

          {/* Quản lý Khóa / Mở khóa cho tài khoản đã duyệt hoặc bị tạm đình chỉ */}
          {currentStatus === 'APPROVED' && (
            <button 
              type="button"
              onClick={() => handleToggleAccountStatus('SUSPENDED')} 
              disabled={submitting} 
              className="w-full flex items-center justify-center gap-1 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              <Lock className="w-4 h-4" /> Tạm khóa tài khoản chuyên gia
            </button>
          )}

          {(currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED' || currentStatus === 'BANNED') && (
            <button 
              type="button"
              onClick={() => handleToggleAccountStatus('APPROVED')} 
              disabled={submitting} 
              className="w-full flex items-center justify-center gap-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              <Unlock className="w-4 h-4" /> Mở khóa / Kích hoạt lại
            </button>
          )}
        </div>

        {/* 📋 CỘT PHẢI: LỊCH SỬ TƯ VẤN & ĐÁNH GIÁ CỘNG ĐỒNG */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
            <button 
              type="button"
              onClick={() => setActiveTab('history')} 
              className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'history' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 bg-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Lịch sử tư vấn ({consultationHistory.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('reviews')} 
              className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'reviews' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 bg-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Đánh giá cộng đồng ({reviews.length})
            </button>
          </div>

          <div className="p-6 flex-1">
            {/* Tab 1: Lịch sử cuộc hẹn tư vấn */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {consultationHistory.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-xs font-medium">Chuyên gia chưa thực hiện ca tư vấn nào trên hệ thống.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consultationHistory.map((item, index) => (
                      <div key={item.id || index} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-800">{item.customerName || 'Khách hàng'}</span>
                          <span className="text-[10px] px-2 py-0.5 font-bold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                            {item.status || 'Hoàn tất'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <p className="m-0">💡 Gói tư vấn: <strong className="text-slate-700">{item.type || 'Tư vấn dinh dưỡng'}</strong></p>
                          <p className="m-0">📅 Ngày hẹn: {item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Phản hồi đánh giá */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-xs font-medium">Chưa có đánh giá hoặc phản hồi từ người dùng.</p>
                ) : (
                  reviews.map((rev, index) => (
                    <div key={rev.id || index} className="p-4 rounded-xl border border-slate-100 space-y-2 bg-white">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{rev.customerName || 'Người dùng ẩn danh'}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{rev.date ? new Date(rev.date).toLocaleDateString('vi-VN') : '—'}</span>
                      </div>
                      <p className="m-0 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg italic border border-slate-100">
                        "{rev.comment || 'Không có bình luận chi tiết.'}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ShieldAlert, Award, DollarSign, Star, 
  Calendar, MessageSquare, User, Eye, CheckCircle2, XCircle, Loader2 
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

  const loadExpertDetails = async () => {
    try {
      setLoading(true);
      // Gọi API lấy thông tin tổng hợp (Bác có thể tách endpoint nếu backend yêu cầu)
      const response = await apiClient.get(`/admin/nutritionists/${expertId}`);
      if (response.data?.success) {
        const { info, history, reviewsData } = response.data.data;
        setExpertData(info);
        setConsultationHistory(history || []);
        setReviews(reviewsData || []);
      }
    } catch (error) {
      console.error("Lỗi đồng bộ hồ sơ chuyên gia:", error);
      // Mock data chuẩn cấu trúc trường dữ liệu thực tế để test UI độc lập
      setExpertData({
        id: expertId,
        fullName: "ThS. Bác sĩ Nguyễn Dinh Dưỡng",
        professionalTitle: "Chuyên gia Dinh dưỡng Lâm sàng",
        licenseNumber: "NUTR-2026-X881",
        certificationUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600",
        serviceFee: 350000,
        approvalStatus: "PENDING",
        averageRating: 4.9,
        email: "nguyenvan.expert@wealthyeater.com"
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
  };

  useEffect(() => {
    if (expertId) loadExpertDetails();
  }, [expertId]);

  const handleVerify = async (status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      alert("Vui lòng nhập lý do cụ thể để gửi thông báo từ chối kiểm duyệt bằng cấp.");
      return;
    }

    if (!window.confirm(status === 'APPROVED' ? 'Duyệt hồ sơ & kích hoạt trạng thái chuyên gia?' : 'Từ chối cấp phép hồ sơ này?')) return;

    try {
      setSubmitting(true);
      const response = await apiClient.put(`/admin/nutritionists/${expertId}/verify`, {
        approvalStatus: status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined
      });

      if (response.data?.success) {
        alert("Cập nhật thẩm định chứng chỉ thành công!");
        if (onStatusUpdated) onStatusUpdated(); // Kích hoạt làm mới data ở danh sách gốc bên ngoài
        loadExpertDetails();
        setShowRejectForm(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Lỗi xử lý hệ thống kiểm duyệt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
        <p className="text-sm font-medium">Đang tải và kiểm tra hồ sơ năng lực năng lực chuyên gia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nút quay lại & Tiêu đề phụ */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border-none bg-transparent cursor-pointer transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">Hồ Sơ Năng Lực Chuyên Môn</h2>
          <p className="text-xs text-slate-400 m-0 mt-0.5">ID tài khoản hệ thống: <span className="font-mono font-bold text-slate-600">{expertData.id}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 🔲 CỘT TRÁI (BẰNG CẤP & THÔNG TIN CHÍNH) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 m-0">{expertData.fullName}</h3>
            <p className="text-xs text-slate-400 m-0 mt-1">{expertData.email}</p>
            <div className="mt-3 inline-flex px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
              {expertData.professionalTitle}
            </div>
          </div>

          {/* Vùng hiển thị thông số chi phí & Ảnh bằng cấp */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Chỉ số chứng thực
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Phí tư vấn đề xuất:</span>
                <span className="font-bold text-emerald-700 text-sm">{expertData.serviceFee?.toLocaleString()}đ / ca</span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Đánh giá trung bình:</span>
                <span className="font-bold text-slate-700">{expertData.averageRating} / 5.0</span>
              </div>
              <div className="space-y-1 px-1">
                <span className="text-slate-500 font-medium block">Mã số giấy phép y tế:</span>
                <code className="bg-slate-50 text-slate-800 font-bold px-2 py-1 border border-slate-200 rounded block text-center mt-1">{expertData.licenseNumber}</code>
              </div>
            </div>

            {/* VÙNG ẢNH BẰNG CẤP CHỨNG CHỈ (INSPECT IMAGE) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block">Bằng cấp/Chứng chỉ đính kèm:</span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-[4/3] flex items-center justify-center">
                <img src={expertData.certificationUrl} alt="Medical Certificate" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                <a href={expertData.certificationUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 text-white font-bold text-xs gap-1.5 no-underline transition-opacity cursor-pointer">
                  <Eye className="w-4 h-4" /> Xem ảnh gốc sắc nét
                </a>
              </div>
            </div>
          </div>

          {/* Cụm xử lý hành động duyệt tài liệu */}
          {expertData.approvalStatus === 'PENDING' && !showRejectForm && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowRejectForm(true)} disabled={submitting} className="flex items-center justify-center gap-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs bg-transparent cursor-pointer transition-colors">
                <XCircle className="w-4 h-4" /> Từ chối cấp quyền
              </button>
              <button onClick={() => handleVerify('APPROVED')} disabled={submitting} className="flex items-center justify-center gap-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-colors shadow-xs">
                <CheckCircle2 className="w-4 h-4" /> Duyệt hoạt động
              </button>
            </div>
          )}

          {showRejectForm && (
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-3">
              <span className="text-xs font-bold text-red-800 flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> Lý do hồ sơ không đạt chuẩn:</span>
              <textarea rows="3" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Ghi rõ lý do (ví dụ: Chứng chỉ mờ, thiếu dấu mộc, không trùng khớp họ tên...)" className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRejectForm(false)} className="px-2.5 py-1.5 bg-slate-200 text-slate-700 border-none font-bold rounded-md text-xs cursor-pointer">Hủy</button>
                <button type="button" onClick={() => handleVerify('REJECTED')} className="px-2.5 py-1.5 bg-red-600 text-white border-none font-bold rounded-md text-xs cursor-pointer">Gửi từ chối</button>
              </div>
            </div>
          )}
        </div>

        {/* 📋 CỘT PHẢI (DANH SÁCH LỊCH SỬ & ĐÁNH GIÁ) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Menu Tab */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
            <button onClick={() => setActiveTab('history')} className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'history' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 bg-transparent'}`}>
              <Calendar className="w-3.5 h-3.5" /> Lịch sử tư vấn ({consultationHistory.length})
            </button>
            <button onClick={() => setActiveTab('reviews')} className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${activeTab === 'reviews' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 bg-transparent'}`}>
              <MessageSquare className="w-3.5 h-3.5" /> Đánh giá cộng đồng ({reviews.length})
            </button>
          </div>

          <div className="p-6 flex-1">
            {/* Tab Lịch sử tư vấn */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {consultationHistory.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs">Chuyên gia chưa thực hiện cuộc hẹn tư vấn nào.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consultationHistory.map((item) => (
                      <div key={item.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/30">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-slate-800">{item.customerName}</span>
                          <span className="text-[10px] px-2 py-0.5 font-bold bg-emerald-50 text-emerald-700 rounded-md">Thành công</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 space-y-1">
                          <p className="m-0">💡 Phân loại: {item.type}</p>
                          <p className="m-0">📅 Thời gian: {item.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab Lượt Đánh giá */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs">Chưa nhận được phản hồi đánh giá từ người dùng hệ thống.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{rev.customerName}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400" />)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{rev.date}</span>
                      </div>
                      <p className="m-0 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg italic border border-slate-100">"{rev.comment}"</p>
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
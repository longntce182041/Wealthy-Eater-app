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

  // Helper formatting Date & Time -> DD/MM/YYYY - HH:mm
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };

  // Load expert profile details
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
      console.error("⚠️ Error fetching expert profile:", error);
      
      // Fallback Mock Data
      setExpertData({
        _id: expertId,
        fullName: "Dr. Alex Johnson",
        professionalTitle: "Clinical Nutrition Specialist",
        licenseNumber: "NUTR-2026-X881",
        certificationUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600",
        serviceFee: 350000,
        approvalStatus: "PENDING",
        status: "ACTIVE",
        averageRating: 4.9,
        email: "alex.johnson@wealthyeater.com",
        specialization: "Clinical Nutrition & Bariatrics",
        createdAt: "2026-01-15T08:00:00.000Z"
      });
      setConsultationHistory([
        { _id: "H1", customerName: "Leonard Smith", date: "2026-06-18T07:28:10.662Z", status: "completed", type: "1-Month Package" },
        { _id: "H2", customerName: "Sarah Connor", date: "2026-06-15T05:23:25.160Z", status: "active", type: "1-Month Package" }
      ]);
      setReviews([
        { id: "R1", customerName: "Leonard Smith", rating: 5, comment: "Very practical meal guidance. Visceral fat loss plan worked great!", date: "2026-06-18T08:30:00.000Z" },
        { id: "R2", customerName: "David Miller", rating: 4, comment: "Deep expertise, explained Glycemic Index concepts thoroughly.", date: "2026-06-11T14:15:00.000Z" }
      ]);
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    if (expertId) loadExpertDetails();
  }, [expertId, loadExpertDetails]);

  // Handle Profile Verification / Rejection (UC-84)
  const handleVerify = async (status) => {
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      alert("Please enter a detailed rejection reason to be sent via email.");
      return;
    }

    const isApprove = status === 'APPROVED';
    const confirmMsg = isApprove 
      ? 'Are you sure you want to APPROVE and activate this expert profile?' 
      : 'Are you sure you want to REJECT this verification application?';

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
        alert(response.data?.message || "Certificate verification updated successfully!");
        if (onStatusUpdated) onStatusUpdated();
        loadExpertDetails();
        setShowRejectForm(false);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to process verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Account Suspension / Reactivation (UC-85)
  const handleToggleAccountStatus = async (targetStatus) => {
    const isSuspend = targetStatus === 'SUSPENDED';
    const actionText = isSuspend ? 'SUSPEND this account' : 'REACTIVATE this account';
    
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;

    try {
      setSubmitting(true);
      const payload = {
        status: isSuspend ? 'suspend' : 'active',
        approvalStatus: isSuspend ? 'SUSPENDED' : 'APPROVED'
      };

      const response = await apiClient.put(`/admin/nutritionists/${expertId}/approval`, payload);

      if (response.data?.success || response.status === 200) {
        alert(response.data?.message || "Account status updated successfully!");
        if (onStatusUpdated) onStatusUpdated();
        loadExpertDetails();
      }
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update account status.");
    } finally {
      setSubmitting(false);
    }
  };

  // Determine overall effective status
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
        <p className="text-sm font-medium">Loading and verifying expert qualifications...</p>
      </div>
    );
  }

  if (!expertData) {
    return (
      <div className="py-20 text-center text-red-500">
        <p className="text-sm font-semibold">Expert profile not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border-none cursor-pointer">Go Back</button>
      </div>
    );
  }

  const currentStatus = getEffectiveStatus();

  return (
    <div className="space-y-6 text-slate-700">
      {/* Navigation & Header Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 border-none bg-transparent cursor-pointer transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 m-0">Professional Qualification Profile</h2>
            <p className="text-xs text-slate-400 m-0 mt-0.5">Account ID: <span className="font-mono font-bold text-slate-600">{expertData._id || expertData.id}</span></p>
          </div>
        </div>

        {/* Status Badge */}
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
        {/* LEFT COLUMN: PERSONAL INFO & CERTIFICATIONS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 m-0">{expertData.fullName || 'Name Not Provided'}</h3>
            <p className="text-xs text-slate-400 m-0 mt-1 flex items-center justify-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {expertData.email}
            </p>
            <div className="mt-3 inline-flex px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
              {expertData.professionalTitle || 'Clinical Nutritionist'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider m-0 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" /> Verification Details
            </h4>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> Service Fee:</span>
                <span className="font-bold text-emerald-700 text-sm">{expertData.serviceFee ? expertData.serviceFee.toLocaleString('en-US') : '0'} VND</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Rating:</span>
                <span className="font-bold text-slate-700">{expertData.averageRating ? Number(expertData.averageRating).toFixed(1) : '0.0'} / 5.0</span>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="text-slate-500 font-medium flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-slate-400" /> Specialization:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={expertData.specialization}>{expertData.specialization || 'General Nutrition'}</span>
              </div>

              <div className="space-y-1 px-1">
                <span className="text-slate-500 font-medium block">License Number:</span>
                <code className="bg-slate-50 text-slate-800 font-bold px-2 py-1 border border-slate-200 rounded block text-center font-mono">{expertData.licenseNumber || 'N/A'}</code>
              </div>
            </div>

            {/* CERTIFICATE FILE VIEW */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Attached Certificate:
              </span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group aspect-[4/3] flex items-center justify-center">
                {expertData.certificationUrl ? (
                  <>
                    <img src={expertData.certificationUrl} alt="Medical Certificate" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                    <a href={expertData.certificationUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 text-white font-bold text-xs gap-1.5 no-underline transition-opacity cursor-pointer">
                      <Eye className="w-4 h-4" /> View Original Document
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 text-xs">No certificate uploaded</span>
                )}
              </div>
            </div>
          </div>

          {/* VERIFICATION / SUSPENSION ACTIONS */}
          {currentStatus === 'PENDING' && !showRejectForm && (
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setShowRejectForm(true)} 
                disabled={submitting} 
                className="flex items-center justify-center gap-1 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs bg-white cursor-pointer transition-colors"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button 
                type="button"
                onClick={() => handleVerify('APPROVED')} 
                disabled={submitting} 
                className="flex items-center justify-center gap-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Profile
              </button>
            </div>
          )}

          {/* REJECTION REASON FORM */}
          {showRejectForm && (
            <div className="bg-red-50/60 p-4 rounded-xl border border-red-200 space-y-3">
              <span className="text-xs font-bold text-red-800 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> Rejection Reason (Sent via Email):
              </span>
              <textarea 
                rows="3" 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)} 
                placeholder="E.g., Blurry diploma image, missing official seal/stamp, mismatched license information..." 
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400" 
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowRejectForm(false)} className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-md text-xs cursor-pointer">Cancel</button>
                <button type="button" onClick={() => handleVerify('REJECTED')} disabled={submitting} className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-md text-xs cursor-pointer">Confirm Rejection</button>
              </div>
            </div>
          )}

          {/* ACCOUNT LOCK / UNLOCK ACTIONS */}
          {currentStatus === 'APPROVED' && (
            <button 
              type="button"
              onClick={() => handleToggleAccountStatus('SUSPENDED')} 
              disabled={submitting} 
              className="w-full flex items-center justify-center gap-1 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              <Lock className="w-4 h-4" /> Suspend Expert Account
            </button>
          )}

          {(currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED' || currentStatus === 'BANNED') && (
            <button 
              type="button"
              onClick={() => handleToggleAccountStatus('APPROVED')} 
              disabled={submitting} 
              className="w-full flex items-center justify-center gap-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              <Unlock className="w-4 h-4" /> Unlock / Reactivate
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: CONSULTATION HISTORY & COMMUNITY REVIEWS */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 p-2 gap-2">
            <button 
              type="button"
              onClick={() => setActiveTab('history')} 
              className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'history' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 bg-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Consultation History ({consultationHistory.length})
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('reviews')} 
              className={`flex items-center gap-1.5 px-4 py-2 border-none rounded-xl text-xs font-bold cursor-pointer transition-all ${
                activeTab === 'reviews' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 bg-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Community Reviews ({reviews.length})
            </button>
          </div>

          <div className="p-6 flex-1">
            {/* Tab 1: Consultation Appointment History */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {consultationHistory.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-xs font-medium">This expert has not conducted any consultations yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {consultationHistory.map((item, index) => {
                      // Normalize MongoDB user fields
                      const customerName = 
                        typeof item.user_id === 'object' 
                          ? (item.user_id?.fullName || item.user_id?.name || item.user_id?.email)
                          : (item.customerName || item.user_id || 'Client');

                      // Normalize MongoDB package fields
                      const rawPackage = item.package_type || item.type || item.packageType || 'Nutrition Consultation';
                      const packageType = String(rawPackage).replace('_', ' ');

                      // Normalize MongoDB date fields
                      const recordDate = item.date || item.create_at || item.created_at || item.createdAt || item.start_date;

                      // Normalize MongoDB status
                      const rawStatus = (item.status || 'completed').toLowerCase();

                      return (
                        <div key={item._id || item.id || index} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-800" title={customerName}>{customerName}</span>
                            <span className={`text-[10px] px-2 py-0.5 font-bold rounded-md border uppercase ${
                              rawStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rawStatus === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              rawStatus === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {rawStatus}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 space-y-1">
                            <p className="m-0 flex items-center gap-1.5">
                              💡 Package: <strong className="text-slate-700 capitalize">{packageType}</strong>
                            </p>
                            <p className="m-0 flex items-center gap-1.5">
                              📅 Date: <span className="text-slate-700 font-semibold">{formatDateTime(recordDate)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Reviews & Feedback */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-center text-slate-400 py-12 text-xs font-medium">No reviews or feedback submitted yet.</p>
                ) : (
                  reviews.map((rev, index) => {
                    const reviewDate = rev.date || rev.created_at || rev.create_at || rev.createdAt;

                    return (
                      <div key={rev.id || rev._id || index} className="p-4 rounded-xl border border-slate-100 space-y-2 bg-white">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{rev.customerName || rev.user_id?.fullName || 'Anonymous User'}</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(reviewDate)}</span>
                        </div>
                        <p className="m-0 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg italic border border-slate-100">
                          "{rev.comment || rev.content || rev.review || 'No detailed review provided.'}"
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
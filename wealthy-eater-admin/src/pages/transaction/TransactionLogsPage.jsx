import React, { useEffect, useState, useCallback } from 'react';
import { 
  Receipt, Search, RefreshCw, CheckCircle2, 
  XCircle, Clock, ShieldCheck, Filter, ChevronLeft, ChevronRight,
  Eye, Copy, Check, ExternalLink, X, CreditCard, User, FileText
} from 'lucide-react';
import apiClient from '../../services/api'; // Điều chỉnh path tùy theo dự án của bạn (ví dụ: '../../api/axiosClient')

export default function TransactionLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // State quản lý Modal & Notification
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedText, setCopiedText] = useState('');

  // 🔄 Fetch data từ API Backend
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/transactions', {
        params: {
          page,
          limit: 10,
          status: statusFilter,
          search: searchTerm
        }
      });
      if (res.data?.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch transaction logs:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  // 📋 Copy to clipboard helper
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // 🏷️ Format Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
            <XCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
    }
  };

  // 📦 Format Package Name
  const formatPackageName = (type) => {
    switch (type) {
      case '1_month': return '1 Month Plan';
      case '3_months': return '3 Months Plan';
      case '6_months': return '6 Months Plan';
      default: return type || 'Standard Plan';
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-700">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-8 h-8 text-primary" /> Transaction Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Automated PayOS checksum verification for platform financial auditability
          </p>
        </div>
        <button 
          onClick={() => fetchLogs(pagination.page)} 
          disabled={loading}
          className="flex items-center px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          {[
            { id: 'ALL', label: 'All Transactions' },
            { id: 'PAID', label: 'Paid' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'FAILED', label: 'Failed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search Order Code / PayOS ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600 min-w-[1000px]">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">PayOS Order Code</th>
                <th className="px-5 py-4">PayOS Trans ID</th>
                <th className="px-5 py-4">Package</th>
                <th className="px-5 py-4 text-right">Gross Amount</th>
                <th className="px-5 py-4 text-right">Platform Fee</th>
                <th className="px-5 py-4 text-right">Expert Payout</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4">Created At</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Fetching transaction logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    No transaction records found matching your query.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Order Code */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.payos_order_code}</span>
                        <button 
                          onClick={() => handleCopy(item.payos_order_code)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded"
                          title="Copy Order Code"
                        >
                          {copiedText === item.payos_order_code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* PayOS Transaction ID */}
                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {item.payos_transaction_id ? (
                        <div className="flex items-center gap-1">
                          <span>{item.payos_transaction_id}</span>
                          <button 
                            onClick={() => handleCopy(item.payos_transaction_id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          >
                            {copiedText === item.payos_transaction_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Package */}
                    <td className="px-5 py-4 font-medium text-slate-700">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">
                        {formatPackageName(item.package_type)}
                      </span>
                    </td>

                    {/* Gross */}
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {item.amount_gross?.toLocaleString('en-US')} VND
                    </td>

                    {/* Fee */}
                    <td className="px-5 py-4 text-right font-semibold text-amber-600">
                      {item.platform_fee?.toLocaleString('en-US')} VND
                    </td>

                    {/* Payout */}
                    <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                      {item.expert_payout?.toLocaleString('en-US')} VND
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Created Date */}
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('en-US') : '—'}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedTx(item)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (Total <strong>{pagination.total}</strong> records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 MODAL: Detailed Transaction Inspection */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-900">Transaction Detail Audit</h3>
              </div>
              <button 
                onClick={() => setSelectedTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-sm">
              
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">PAYOS ORDER CODE</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTx.payos_order_code}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">STATUS</span>
                  <div className="mt-1">{renderStatusBadge(selectedTx.status)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">PAYOS TRANSACTION ID</span>
                  <span className="font-mono text-slate-700">{selectedTx.payos_transaction_id || 'Not generated yet'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">PACKAGE TYPE</span>
                  <span className="font-medium text-slate-800">{formatPackageName(selectedTx.package_type)}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Breakdown</h4>
                <div className="space-y-2 border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Gross Amount (Client Paid):</span>
                    <span className="font-bold text-slate-900">{selectedTx.amount_gross?.toLocaleString('en-US')} VND</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Platform Commission Fee:</span>
                    <span className="font-bold text-amber-600">+{selectedTx.platform_fee?.toLocaleString('en-US')} VND</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-slate-800">Nutritionist Net Payout:</span>
                    <span className="font-extrabold text-emerald-600 text-base">{selectedTx.expert_payout?.toLocaleString('en-US')} VND</span>
                  </div>
                </div>
              </div>

              {/* Foreign Keys & Metadata */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System References</h4>
                <div className="space-y-1.5 text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">Contract ID:</span>
                    <span className="text-slate-800 font-semibold">{selectedTx.consultation_contracts_id_fk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500">User ID:</span>
                    <span className="text-slate-800 font-semibold">{selectedTx.user_id?._id || selectedTx.user_id}</span>
                  </div>
                </div>
              </div>

              {/* PayOS External Links */}
              {selectedTx.payos_payment_link && (
                <div className="pt-2">
                  <a 
                    href={selectedTx.payos_payment_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Open PayOS Payment Checkout <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Percent, Save, RefreshCw, AlertCircle, CheckCircle2, 
  ShieldAlert, Calculator, Info 
} from 'lucide-react';
import apiClient from '../../services/api';

export default function CommissionSettingsPage() {
  const [commissionRate, setCommissionRate] = useState(15);
  const [initialRate, setInitialRate] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification status
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Sample simulation amount (1,000,000 VND)
  const sampleAmount = 1000000;

  // Fetch current configuration from Backend
  const fetchCommissionRate = async () => {
    setLoading(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const res = await apiClient.get('/admin/settings/commission-rate');
      if (res.data?.success) {
        const rate = res.data.data.commission_rate;
        setCommissionRate(rate);
        setInitialRate(rate);
      }
    } catch (err) {
      console.error('Failed to load commission rate:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load commission rate configuration from server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionRate();
  }, []);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    const numRate = Number(commissionRate);
    if (isNaN(numRate) || numRate < 0 || numRate > 100) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid percentage rate between 0% and 100%.'
      });
      return;
    }

    setSaving(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const res = await apiClient.put('/admin/settings/commission-rate', {
        commission_rate: numRate
      });

      if (res.data?.success) {
        setInitialRate(numRate);
        setStatusMessage({
          type: 'success',
          text: 'Platform commission rate updated successfully!'
        });
      }
    } catch (err) {
      console.error('Failed to update commission rate:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'An error occurred while saving the configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate live preview fee breakdown
  const platformFee = Math.round((sampleAmount * (Number(commissionRate) || 0)) / 100);
  const expertPayout = sampleAmount - platformFee;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 text-slate-700">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Percent className="w-7 h-7 text-primary" /> Configure Commission Rates (UC-81)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Set the platform commission percentage retained from each nutritionist service booking transaction.
          </p>
        </div>
        <button
          onClick={fetchCommissionRate}
          disabled={loading || saving}
          className="flex items-center px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Alert Status Message */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{statusMessage.text}</div>
        </div>
      )}

      {/* Main Form & Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Input Form Column */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label htmlFor="commissionInput" className="block text-sm font-bold text-slate-900 mb-1.5">
                Platform Commission Rate (%) <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Specify the fee percentage automatically deducted from total customer payments.
              </p>

              <div className="relative rounded-xl shadow-sm max-w-xs">
                <input
                  id="commissionInput"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={loading || saving}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full text-lg font-bold pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all"
                  placeholder="15"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 font-bold">
                  %
                </div>
              </div>
            </div>

            {/* Warning Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Updates will apply immediately to all newly initiated service contract payment transactions.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || saving || Number(commissionRate) === Number(initialRate)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Configuration
                  </>
                )}
              </button>

              {Number(commissionRate) !== Number(initialRate) && (
                <button
                  type="button"
                  onClick={() => setCommissionRate(initialRate)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>
              )}
            </div>

          </form>
        </div>

        {/* Live Calculation Preview Column */}
        <div className="md:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Calculator className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Revenue Split Simulation</h3>
          </div>

          <p className="text-xs text-slate-500">
            Sample breakdown for a service contract valued at <strong>1,000,000 VND</strong>:
          </p>

          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 text-sm">
            
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Service Value:</span>
              <span className="font-bold text-slate-900">1,000,000 VND</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                Platform Fee ({commissionRate || 0}%):
              </span>
              <span className="font-bold text-amber-600">
                +{platformFee.toLocaleString('en-US')} VND
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
              <span>Nutritionist Payout:</span>
              <span className="font-extrabold text-emerald-600 text-base">
                {expertPayout.toLocaleString('en-US')} VND
              </span>
            </div>

          </div>

          <div className="flex items-start gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This breakdown logic will automatically apply when processing successful PayOS payment webhooks.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
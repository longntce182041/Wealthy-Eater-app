const mongoose = require('mongoose');

const ConsultationContractSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  nutritionist_id: { 
    type: String, 
    ref: 'Nutritionist', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending_payment', 'active', 'completed', 'terminated'], 
    default: 'pending_payment' 
  },
  package_type: {
    type: String,
    enum: ['1_month', '3_months', '6_months'],
    default: '1_month'
  },
  expire_at: { 
    type: Date 
  },
  create_at: { type: Date, default: Date.now }
});

// ── Indexes ──────────────────────────────────────────────────────────────────
// Query: "all contracts for a specific user, filtered by status"
ConsultationContractSchema.index({ user_id: 1, status: 1 });
// Query: "all contracts for a specific nutritionist, filtered by status"
ConsultationContractSchema.index({ nutritionist_id: 1, status: 1 });

module.exports = mongoose.model('ConsultationContract', ConsultationContractSchema);
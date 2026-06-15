const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  consultation_contracts_id_fk: { 
    type: String, 
    ref: 'ConsultationContract', 
    required: true 
  }, 
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  payos_order_code: { 
    type: String, 
    required: true 
  },
  payos_transaction_id: { 
    type: String 
  },
  payos_payment_link: { 
    type: String 
  },
  payos_qr_code: { 
    type: String 
  },
  amount_gross: { 
    type: Number, 
    required: true 
  },
  platform_fee: { 
    type: Number, 
    default: 0 
  },
  expert_payout: { 
    type: Number, 
    default: 0 
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  package_type: {
    type: String,
    enum: ['1_month', '3_months', '6_months'],
    default: '1_month'
  },
  description: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Unique: prevent duplicate transactions for the same PayOS order
TransactionSchema.index({ payos_order_code: 1 }, { unique: true });
// Unique: prevent double processing of the same PayOS transaction id
TransactionSchema.index({ payos_transaction_id: 1 }, { unique: true, sparse: true });
// Query: "my transaction history, newest first"
TransactionSchema.index({ user_id: 1, createdAt: -1 });
// Query: "find transaction(s) for a given contract"
TransactionSchema.index({ consultation_contracts_id_fk: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
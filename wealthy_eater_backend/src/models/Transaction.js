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
}
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
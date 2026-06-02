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
  nutritionists_id: { 
    type: String, 
    enum: ['pending_payment', 'active', 'completed', 'terminated'], 
    default: 'pending_payment' 
  },
  create_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConsultationContract', ConsultationContractSchema);
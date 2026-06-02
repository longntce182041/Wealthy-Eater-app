const mongoose = require('mongoose');

const ConsultationMessageSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  contract_id: { 
    type: String, 
    ref: 'ConsultationContract', 
    required: true 
  }, 
  sender_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  }, 
  messages_type: { 
    type: String, 
    enum: ['text', 'image', 'system alert'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true
  },
  create_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConsultationMessage', ConsultationMessageSchema);
const mongoose = require('mongoose');

const NutritionistSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, 
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  full_name: { 
    type: String, 
    required: true 
  },
  specialization: { 
    type: String 
  },
  service_fee: { 
    type: Number, 
    required: true 
  },
  certification_url: { 
    type: String 
  },
  approval_status: { 
    type: String, 
    enum: ['pending', 'approval', 'reject'], 
    default: 'pending' 
  },
  average_rating: { type: Number, default: 0.0 }
});

module.exports = mongoose.model('Nutritionist', NutritionistSchema);
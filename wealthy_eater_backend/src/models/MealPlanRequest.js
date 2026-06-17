const mongoose = require('mongoose');

const MealPlanRequestSchema = new mongoose.Schema({
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
    enum: ['PENDING', 'APPROVED', 'REJECTED'], 
    default: 'PENDING',
    required: true
  },
  created_at: { type: Date, default: Date.now }
});

// Indexes
MealPlanRequestSchema.index({ user_id: 1, status: 1 });
MealPlanRequestSchema.index({ nutritionist_id: 1, status: 1 });

module.exports = mongoose.model('MealPlanRequest', MealPlanRequestSchema);

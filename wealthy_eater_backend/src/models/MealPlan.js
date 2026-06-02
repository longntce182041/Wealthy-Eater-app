const mongoose = require('mongoose');

const MealPlanSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id_fk: { 
    type: String, 
    ref: 'User', 
    required: true
   },
  nutritionist_id_fk: { 
    type: String, 
    ref: 'Nutritionist' 
  },
  date: { 
    type: Date, 
    required: true 
  },
  created_by: {type: String }
});

module.exports = mongoose.model('MealPlan', MealPlanSchema);
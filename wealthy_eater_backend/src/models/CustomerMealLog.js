const mongoose = require('mongoose');

const CustomerMealLogSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
},
  recipe_id: { 
    type: String, 
    ref: 'Recipe', 
    required: true 
},
  actual_weight_gram: { 
    type: Number, 
    required: true 
},
  actual_calories: { 
    type: Number, 
    required: true 
  },
  actual_protein: { 
    type: Number, 
    default: 0 
  },
  actual_carbs: { 
    type: Number, 
    default: 0 
  },
  actual_fat: { 
    type: Number, 
    default: 0 
  },
  custom_name: {
    type: String,
    default: null
  },
  deviation_flag: { 
    type: Boolean, 
    default: false 
  },
  meal_plan_item_id: {
    type: String,
    default: null
  },
  create_at: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('CustomerMealLog', CustomerMealLogSchema);
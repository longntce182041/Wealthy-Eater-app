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
  deviation_flag: { 
    type: Boolean, 
    default: false 
},
  create_at: { 
    type: Date, 
    default: Date.now 
}
});

module.exports = mongoose.model('CustomerMealLog', CustomerMealLogSchema);
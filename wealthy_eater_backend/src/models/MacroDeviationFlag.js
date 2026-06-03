const mongoose = require('mongoose');

const MacroDeviationFlagSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  customer_meal_log: { 
    type: String, 
    ref: 'CustomerMealLog', 
    required: true
   },
  contract_id: { 
    type: String, 
    ref: 'ConsultationContract', 
    required: true 
  },
  calculated_delta_calories: { 
    type: Number, 
    required: true
   },
  nutritionist_review: { 
    type: String 
  },
  create_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MacroDeviationFlag', MacroDeviationFlagSchema);
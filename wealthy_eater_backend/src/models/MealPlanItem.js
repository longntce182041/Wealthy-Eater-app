const mongoose = require('mongoose');

const MealPlanItemSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  meal_plan_id: { 
    type: String, 
    ref: 'MealPlan', 
    required: true 
  },
  recipe_id: { 
    type: String, 
    ref: 'Recipe', 
    required: true 
  },
  meal_type: { 
    type: String, 
    required: true 
  }
});

module.exports = mongoose.model('MealPlanItem', MealPlanItemSchema);
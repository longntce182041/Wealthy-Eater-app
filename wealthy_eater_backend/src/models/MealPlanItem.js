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
    default: 'AI_GENERATED'
  },
  meal_type: { 
    type: String, 
    required: true 
  },
  day_of_week: {
    type: Number,  // 1-7 (Day 1 through Day 7)
    default: null
  },
  customized_servings_gram: {
    type: Number,
    default: null
  },
  custom_ingredients: [{
    ingredient_id: { type: String, ref: 'Ingredient' },
    amount_gram: { type: Number, required: true }
  }],
  target_calories: {
    type: Number,
    default: null
  },
  day_number: {
    type: Number,
    default: 1
  },
  is_completed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('MealPlanItem', MealPlanItemSchema);
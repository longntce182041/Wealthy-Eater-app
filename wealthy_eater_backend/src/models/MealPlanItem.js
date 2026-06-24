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
  }
});

module.exports = mongoose.model('MealPlanItem', MealPlanItemSchema);
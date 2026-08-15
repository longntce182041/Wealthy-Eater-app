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

  // ── Target Macro Snapshot ─────────────────────────────────────────────────
  // Full macro targets for THIS specific meal slot at the time of plan generation.
  // Used by regenerate-ai endpoint to correctly target the same macro breakdown
  // without relying on fixed-ratio approximations (which are inaccurate when a
  // medical condition distributes macros unevenly across meals).
  // null = legacy item (pre-feature); fallback to default ratio (25/40/35%) in that case.
  target_snapshot: {
    calories: { type: Number, default: null },
    protein:  { type: Number, default: null },
    carbs:    { type: Number, default: null },
    fat:      { type: Number, default: null },
  },

  is_completed: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('MealPlanItem', MealPlanItemSchema);
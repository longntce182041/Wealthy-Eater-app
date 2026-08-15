const mongoose = require('mongoose');

const MedicalConditionSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String 
  },
  description: { 
    type: String 
  },
  dietary_guideline: { 
    type: String 
  },

  // ── Medical Condition Filter Tags ─────────────────────────────────────────
  // Tags matching Ingredient.health_tags — recipes containing ingredients with
  // these tags will be excluded for users with this condition.
  // Example: ["HIGH_SUGAR", "HIGH_GI", "REFINED_CARB"]
  excluded_ingredient_tags: {
    type: [String],
    default: [],
  },

  // ── Nutrient Constraint Overrides ─────────────────────────────────────────
  // Optional constraints that override or supplement the default macro targets.
  // Only fields that are non-null are enforced by the MILP solver.
  nutrient_constraints: {
    max_sugar_g_per_day:    { type: Number, default: null },
    max_glycemic_index_avg: { type: Number, default: null },
    min_fiber_g_per_day:    { type: Number, default: null },
    // carb_ratio_max: max fraction of total calories from carbs (0–1)
    carb_ratio_max:         { type: Number, default: null },
    max_sodium_mg_per_day:  { type: Number, default: null },
    max_purine:             { type: Boolean, default: null },
  },
});

module.exports = mongoose.model('MedicalCondition', MedicalConditionSchema);
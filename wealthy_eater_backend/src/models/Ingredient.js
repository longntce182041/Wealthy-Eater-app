const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  name: { 
    type: String, 
    required: true 
  },
  image_url: { 
    type: String 
  },
  calories_per_unit: { 
    type: Number, 
    required: true 
  },
  protein: { 
    type: Number, 
    default: 0 
  },
  fat: { 
    type: Number, 
    default: 0 
  },
  carbs: { 
    type: Number, 
    default: 0 
  }, 
  description: { type: String },
  unit: { 
    type: String, 
    required: true,
    enum: ['gram', 'ml', 'piece', 'cup'],
    default: 'gram'
  },

  // ── Medical Condition Filter Tags ─────────────────────────────────────────
  // Used by recipe filter to exclude ingredients that conflict with a user's
  // medical condition (e.g., "HIGH_SUGAR" is excluded for Type 2 Diabetes).
  // Populated by nutritionist/admin. Default [] = no restrictions.
  health_tags: {
    type: [String],
    default: [],
  },

  // Optional: Glycemic Index value for this ingredient (0–100+).
  // Used for max_glycemic_index_avg constraint enforcement.
  glycemic_index: {
    type: Number,
    default: null,
  },
});

module.exports = mongoose.model('Ingredient', IngredientSchema);
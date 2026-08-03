const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, 
  name: { 
    type: String, required: true },
  description: { 
    type: String 
  },
  image_url: { 
    type: String 
  },
  cooking_time: { 
    type: Number 
  },
  base_servings: { 
    type: Number, default: 1 
  },
  status: { 
    type: String 
  },
  level_cooking: { 
    type: String 
  },
  cooking_step: { 
    type: String 
  },
  // UC-52: meal types this recipe is suitable for (used by recipe picker in Adjust Meal)
  meal_types: {
    type: [String],
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
    default: [],
  },
});

// Compound index: speeds up mealType filter + status filter queries
RecipeSchema.index({ meal_types: 1, status: 1 });

module.exports = mongoose.model('Recipe', RecipeSchema);
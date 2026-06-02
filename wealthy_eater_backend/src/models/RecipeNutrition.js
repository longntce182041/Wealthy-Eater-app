const mongoose = require('mongoose');

const RecipeNutritionSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  recipe_id_fk: { 
    type: String, 
    ref: 'Recipe', 
    required: true 
  },
  calories: { 
    type: Number, required: true 
  },
  protein: { 
    type: Number, default: 0 
  },
  fat: { 
    type: Number, default: 0 
  },
  carbs: { 
    type: Number, default: 0 
  }
});

module.exports = mongoose.model('RecipeNutrition', RecipeNutritionSchema);
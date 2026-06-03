const mongoose = require('mongoose');

const RecipeIngredientSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  recipe_id: { 
    type: String, ref: 'Recipe', required: true 
  },
  ingredient_id: { 
    type: String, ref: 'Ingredient', required: true 
  },
  base_quantity: { 
    type: Number, required: true 
  },
  unit: { 
    type: String, required: true 
  }
});

module.exports = mongoose.model('RecipeIngredient', RecipeIngredientSchema);
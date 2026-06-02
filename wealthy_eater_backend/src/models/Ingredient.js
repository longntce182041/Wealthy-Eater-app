const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  name: { 
    type: String, 
    required: true },
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
  unit: { type: String, required: true },
});

module.exports = mongoose.model('Ingredient', IngredientSchema);
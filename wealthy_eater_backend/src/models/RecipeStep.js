const mongoose = require('mongoose');

const RecipeStepSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  recipe_id: { 
    type: String, ref: 'Recipe', required: true 
  },
  step_number: { 
    type: Number, required: true 
  },
  instruction: { 
    type: String, required: true 
  }
});

module.exports = mongoose.model('RecipeStep', RecipeStepSchema);
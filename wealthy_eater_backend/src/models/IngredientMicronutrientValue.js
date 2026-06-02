const mongoose = require('mongoose');

const IngredientMicronutrientValueSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  ingredient_id: { 
    type: String, 
    ref: 'Ingredient', 
    required: true 
},
  micronutrient_id: { 
    type: String, 
    ref: 'Micronutrient', 
    required: true 
},
  amount: { 
    type: Number, 
    required: true 
}
});

module.exports = mongoose.model('IngredientMicronutrientValue', IngredientMicronutrientValueSchema);
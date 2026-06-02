const mongoose = require('mongoose');

const RecipeMicronutrientValueSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  recipe_id_fk: { 
    type: String, ref: 'Recipe', required: true 
  },
  micronutrient_id_fk: { 
    type: String, ref: 'Micronutrient', required: true 
  },
  amount: { 
    type: Number, required: true 
  }
});

module.exports = mongoose.model('RecipeMicronutrientValue', RecipeMicronutrientValueSchema);
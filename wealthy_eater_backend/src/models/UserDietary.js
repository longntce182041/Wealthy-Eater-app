const mongoose = require('mongoose');

const UserDietarySchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  medical_condition_id: { 
    type: String, 
    ref: 'MedicalCondition' 
  },
  allergies: [{ type: String, ref: 'Ingredient' }],
  dislike_ingredients: [{ type: String, ref: 'Ingredient' }], 
  cooking_skill_level: { 
    type: String 
  },
  available_cooking_time: { 
    type: Number 
  },
  activity_level: { 
    type: String, 
    default: null 
  },
  diet_preferences: { 
    type: [String], 
    default: [] 
  }
});

module.exports = mongoose.model('UserDietary', UserDietarySchema);
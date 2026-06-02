const mongoose = require('mongoose');

const UserDietarySchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id_fk: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  medical_condition_id: { 
    type: String, 
    ref: 'MedicalCondition' 
  },
  allergies: [{ type: String }],
  dislike_ingredients: [{ type: String }], // Khớp với dislike_increadients trong ERD
  cooking_skill_level: { 
    type: String 
  },
  available_cooking_time: { 
    type: Number 
  }
});

module.exports = mongoose.model('UserDietary', UserDietarySchema);
const mongoose = require('mongoose');

const NutritionAssessmentSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  }, 
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true },
  nutritionist_id: { 
    type: String, 
    ref: 'Nutritionist', 
    required: true 
  },
  diagnosis: { 
    type: String 
  },
  recommendations: { 
    type: String 
  }, 
  notes: { 
    type: String 
  }
});

module.exports = mongoose.model('NutritionAssessment', NutritionAssessmentSchema);
const mongoose = require('mongoose');

const MedicalConditionSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String 
  },
  description: { 
    type: String 
  },
  dietary_guideline: { 
    type: String 
  }
});

module.exports = mongoose.model('MedicalCondition', MedicalConditionSchema);
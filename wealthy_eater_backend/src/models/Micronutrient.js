const mongoose = require('mongoose');

const MicronutrientSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  name: { 
    type: String, 
    required: true 
  },
  unit: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  }
});

module.exports = mongoose.model('Micronutrient', MicronutrientSchema);
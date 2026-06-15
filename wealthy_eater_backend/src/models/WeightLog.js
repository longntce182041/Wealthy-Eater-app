const mongoose = require('mongoose');

const WeightLogSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  weight: { 
    type: Number, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    default: Date.now 
  }
});

module.exports = mongoose.model('WeightLog', WeightLogSchema);

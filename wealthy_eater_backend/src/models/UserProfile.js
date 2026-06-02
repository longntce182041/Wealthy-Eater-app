const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  age: { 
    type: Number, required: true 
  },
  gender: { 
    type: String, required: true 
  },
  height: { 
    type: Number, required: true 
  },
  weight: { 
    type: Number, required: true 
  },
  health_goal: { 
    type: String 
  },
  bmi: { 
    type: Number 
  },
  tdee: { 
    type: Number 

  },
  bmr: { 
    type: String 

  }
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
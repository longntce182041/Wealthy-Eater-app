const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'admin', 'nutritionist'], 
    required: true 
  },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
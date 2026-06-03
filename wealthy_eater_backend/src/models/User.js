const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, default: null },
    role: {
      type: String,
      enum: ['customer', 'admin', 'nutritionist'],
      required: true,
      default: 'customer',
    },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email:                  { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: null },
    phone:                  { type: String, unique: true, sparse: true, trim: true, default: null },
    password_hash:          { type: String, default: null },
    role: {
      type: String,
      enum: ['customer', 'admin', 'nutritionist'],
      required: true,
      default: 'customer',
    },
    otp_code:               { type: String, default: null },
    otp_expires_at:         { type: Date, default: null },
    is_active:              { type: Boolean, default: true },
    reset_password_token:   { type: String, default: null },
    reset_password_expires: { type: Date, default: null },
    created_at:             { type: Date, default: Date.now },
    fcmToken:               { type: String, default: null },

    created_at:             { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', UserSchema);
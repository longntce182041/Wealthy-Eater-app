const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    email:                   { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone:                   { type: String, unique: true, sparse: true, trim: true },
    password_hash:           { type: String, default: null },
    role: {
      type: String,
      enum: ['customer', 'admin', 'nutritionist'],
      required: true,
      default: 'customer',
    },
    // 🟢 THÊM TRƯỜNG STATUS VÀO ĐÂY:
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    otp_code:                { type: String, default: null },
    otp_expires_at:          { type: Date, default: null },
    is_active:               { type: Boolean, default: true },
    reset_password_token:    { type: String, default: null },
    reset_password_expires:  { type: Date, default: null },
    fcmToken:                { type: String, default: null },
    googleId:                { type: String, default: null },
    temp_link_email:         { type: String, default: null },
    temp_link_phone:         { type: String, default: null },
    temp_link_otp:           { type: String, default: null },
    temp_link_otp_expires_at: { type: Date, default: null },
    temp_link_otp_attempts:  { type: Number, default: 0 },
    created_at:              { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ROLES = ['customer', 'admin', 'nutritionist'];

const UserSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // password optional to support OAuth providers
    password: { type: String },
    // OAuth provider fields
    googleId: { type: String, index: true },
    avatar: { type: String },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ROLES, default: 'customer' },
    status: { type: String, enum: ['active', 'inactive', 'banned'], default: 'active' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);

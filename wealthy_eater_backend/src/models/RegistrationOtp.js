const mongoose = require('mongoose');

const RegistrationOtpSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    email: { type: String, required: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    otp_hash: { type: String, required: true },
    expires_at: { type: Date, required: true },
    attempts: { type: Number, default: 0 }, // incorrect OTP attempts
    resend_count: { type: Number, default: 0 }, // resend OTP counter (per hour)
    last_sent_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Optional TTL index if you want to auto-delete expired docs (safe to keep)
RegistrationOtpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RegistrationOtp', RegistrationOtpSchema);

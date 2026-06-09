const mongoose = require('mongoose');

const NotificationSettingSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true,
    unique: true
  },
  is_push_enabled: {
    type: Boolean,
    default: true
  },
  water_reminder: {
    enabled: { type: Boolean, default: false },
    interval_minutes: { type: Number, default: 120 },
    start_time: { type: String, default: "08:00" },
    end_time: { type: String, default: "20:00" }
  },
  meal_reminders: [
    {
      meal_type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      time: { type: String },
      enabled: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('NotificationSetting', NotificationSettingSchema);

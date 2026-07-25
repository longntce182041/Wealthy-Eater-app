const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    value: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true 
    },
    description: { 
      type: String, 
      default: '' 
    },
    updated_by: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      default: null
    }
  },
  { 
    timestamps: true,
    collection: 'system_settings'
  }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
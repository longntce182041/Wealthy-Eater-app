const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  _id: { 
    type: String, 
    default: () => new mongoose.Types.ObjectId().toString() 
  },
  user_id: { 
    type: String, 
    ref: 'User', 
    required: true 
}, // ID của Admin thực hiện
  action: { 
    type: String, 
    required: true 
}, // Thao tác (ví dụ: THÊM, SỬA, XÓA, KHÓA, DUYỆT)
  description: { 
    type: String, 
    required: true 
}, // Mô tả chi tiết bằng chuỗi văn bản
  created_at: { 
    type: Date, 
    default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
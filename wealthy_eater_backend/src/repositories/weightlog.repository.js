const WeightLog = require('../models/WeightLog');

class WeightLogRepository {
  static create(doc) {
    const log = new WeightLog(doc);
    return log.save();
  }

  static findByUserId(userId) {
    return WeightLog.find({ user_id: userId }).sort({ date: 1 }).exec();
  }

  static findLatestByUserId(userId) {
    return WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).exec();
  }
}

module.exports = WeightLogRepository;

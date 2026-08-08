const WeightLog = require('../models/WeightLog');

class WeightLogRepository {
  static create(doc) {
    const log = new WeightLog(doc);
    return log.save();
  }

  /**
   * Fetches all weight logs for a user, sorted ascending by date.
   * Used by both the self-audit and the nutritionist biometrics review (UC-50).
   * @param {string} userId
   * @returns {Promise<WeightLog[]>}
   */
  static findByUserId(userId) {
    return WeightLog.find({ user_id: userId }).sort({ date: 1 }).exec();
  }

  /**
   * Explicit alias for UC-50: audit-biometrics endpoint.
   * Ascending sort ensures chart data is rendered oldest → newest.
   * @param {string} userId
   * @returns {Promise<WeightLog[]>}
   */
  static findByUserIdAsc(userId) {
    return WeightLog.find({ user_id: userId }).sort({ date: 1 }).lean().exec();
  }

  static findLatestByUserId(userId) {
    return WeightLog.findOne({ user_id: userId }).sort({ date: -1 }).exec();
  }
}

module.exports = WeightLogRepository;

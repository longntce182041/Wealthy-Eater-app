const UserProfile = require('../models/UserProfile');

class UserProfileRepository {
  static findByUserId(userId) {
    return UserProfile.findOne({ user_id: userId }).exec();
  }

  static create(doc) {
    const p = new UserProfile(doc);
    return p.save();
  }

  static updateByUserId(userId, patch) {
    return UserProfile.findOneAndUpdate({ user_id: userId }, patch, { returnDocument: 'after', upsert: true }).exec();
  }
}

module.exports = UserProfileRepository;

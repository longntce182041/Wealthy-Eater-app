const User = require('../models/user.model');

class UserRepository {
  static findByEmail(email) {
    return User.findOne({ email }).exec();
  }

  static findById(id) {
    return User.findById(id).exec();
  }
  
  static findByGoogleId(googleId) {
    return User.findOne({ googleId }).exec();
  }

  static create(userObj) {
    const u = new User(userObj);
    return u.save();
  }
}

module.exports = UserRepository;

const RegistrationOtp = require('../models/RegistrationOtp');

class RegistrationRepository {
  static findByEmail(email) {
    return RegistrationOtp.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  static create(doc) {
    const r = new RegistrationOtp(doc);
    return r.save();
  }

  static updateById(id, patch) {
    return RegistrationOtp.findByIdAndUpdate(id, patch, { returnDocument: 'after' }).exec();
  }

  static deleteByEmail(email) {
    return RegistrationOtp.deleteOne({ email: email.toLowerCase().trim() }).exec();
  }

  static deleteById(id) {
    return RegistrationOtp.findByIdAndDelete(id).exec();
  }
}

module.exports = RegistrationRepository;

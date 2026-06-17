const AppError = require('../utils/AppError');
const ProfileService = require('../services/profile.service');



async function getMyProfile(req, res, next) {
  try {
    const userId = req.user?.sub;
    const profile = await ProfileService.getProfile(userId);
    return res.json({ success: true, data: profile, error: null });
  } catch (err) {
    return next(err);
  }
}

async function createOrUpdateProfile(req, res, next) {
  try {
    const userId = req.user?.sub;
    const data = req.body || {};
    const saved = await ProfileService.createOrUpdate(userId, data);
    return res.json({ success: true, data: saved, error: null });
  } catch (err) {
    return next(err);
  }
}

async function logWeight(req, res, next) {
  try {
    const userId = req.user?.sub;
    const { weight, timestamp } = req.body;
    if (!weight) return next(new AppError('Weight is required.', 400, 'VALIDATION_ERROR'));

    const log = await ProfileService.logWeight(userId, Number(weight), timestamp);
    return res.json({ success: true, data: log, error: null });
  } catch (err) {
    return next(err);
  }
}

async function getWeightHistory(req, res, next) {
  try {
    const userId = req.user?.sub;
    const history = await ProfileService.getWeightHistory(userId);
    return res.json({ success: true, data: history, error: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMyProfile, createOrUpdateProfile, logWeight, getWeightHistory };

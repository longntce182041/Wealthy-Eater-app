const ProfileService = require('../services/profile.service');

function handleError(err, res) {
  const status = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'An unexpected error occurred.';
  return res.status(status).json({ success: false, message });
}

async function getMyProfile(req, res) {
  try {
    const userId = req.user?.sub;
    const profile = await ProfileService.getProfile(userId);
    return res.json({ success: true, data: profile });
  } catch (err) {
    return handleError(err, res);
  }
}

async function createOrUpdateProfile(req, res) {
  try {
    const userId = req.user?.sub;
    const data = req.body || {};
    const saved = await ProfileService.createOrUpdate(userId, data);
    return res.json({ success: true, message: 'Profile saved', data: saved });
  } catch (err) {
    return handleError(err, res);
  }
}

async function logWeight(req, res) {
  try {
    const userId = req.user?.sub;
    const { weight, timestamp } = req.body;
    if (!weight) return res.status(400).json({ success: false, message: 'Weight is required.' });

    const log = await ProfileService.logWeight(userId, Number(weight), timestamp);
    return res.json({ success: true, message: 'Weight logged successfully', data: log });
  } catch (err) {
    return handleError(err, res);
  }
}

async function getWeightHistory(req, res) {
  try {
    const userId = req.user?.sub;
    const history = await ProfileService.getWeightHistory(userId);
    return res.json({ success: true, data: history });
  } catch (err) {
    return handleError(err, res);
  }
}

module.exports = { getMyProfile, createOrUpdateProfile, logWeight, getWeightHistory };

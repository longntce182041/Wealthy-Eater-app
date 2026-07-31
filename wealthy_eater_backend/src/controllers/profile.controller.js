const AppError = require('../utils/AppError');
const ProfileService = require('../services/profile.service');



async function getMyProfile(req, res, next) {
  try {
    const userId = req.user?.sub;
    const profile = await ProfileService.getProfile(userId);
    return res.json({ success: true, data: profile });
  } catch (err) {
    return next(err);
  }
}

async function createOrUpdateProfile(req, res, next) {
  try {
    const userId = req.user?.sub;
    const data = req.body || {};
    const saved = await ProfileService.createOrUpdate(userId, data);
    return res.json({ success: true, message: 'Profile saved', data: saved });
  } catch (err) {
    return next(err);
  }
}

async function logWeight(req, res, next) {
  try {
    const userId = req.user?.sub;
    const { weight, timestamp } = req.body;
    if (!weight) return next(new AppError('Weight is required.', 400));

    const log = await ProfileService.logWeight(userId, Number(weight), timestamp);
    return res.json({ success: true, message: 'Weight logged successfully', data: log });
  } catch (err) {
    return next(err);
  }
}

async function getWeightHistory(req, res, next) {
  try {
    const userId = req.user?.sub;
    const history = await ProfileService.getWeightHistory(userId);
    return res.json({ success: true, data: history });
  } catch (err) {
    return next(err);
  }
}

async function getSetupMetadata(req, res, next) {
  try {
    const metadata = await ProfileService.getSetupMetadata();
    return res.json({ success: true, data: metadata });
  } catch (err) {
    return next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    const userId = req.user?.sub;
    let avatarUrl = null;

    if (req.file) {
      avatarUrl = req.file.path || req.file.secure_url;
    } else if (req.body?.avatar_url || req.body?.avatar) {
      const inputStr = req.body.avatar_url || req.body.avatar;
      if (inputStr.startsWith('data:image')) {
        const { uploadBase64ToCloudinary } = require('../config/cloudinary.config');
        avatarUrl = await uploadBase64ToCloudinary(inputStr);
      } else {
        avatarUrl = inputStr;
      }
    }

    if (!avatarUrl) {
      throw new AppError('No avatar file or image data provided', 400);
    }

    const updatedProfile = await ProfileService.updateAvatar(userId, avatarUrl);
    return res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: updatedProfile,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMyProfile, createOrUpdateProfile, logWeight, getWeightHistory, getSetupMetadata, uploadAvatar };


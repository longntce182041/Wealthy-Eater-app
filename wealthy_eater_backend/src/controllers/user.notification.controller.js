const AppError = require('../utils/AppError');
const userNotificationService = require('../services/user.notification.service');

// ─── Shared response helper ──────────────────────────────────────────────────
function handleError(err, res, next, context) {
  if (err.code === 'NOT_FOUND') {
    return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
  }
  console.error(`[Notification Controller] ${context} error:`, err);
  return next(new AppError('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR'));
}

exports.getSettings = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.getSettings(user_id);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, res, next, 'getSettings');
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.updateSettings(user_id, req.body);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, res, next, 'updateSettings');
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = parseInt(req.query.skip, 10) || 0;

    const history = await userNotificationService.getHistory(user_id, limit, skip);
    return res.json({ success: true, data: history, error: null });
  } catch (error) {
    return handleError(error, res, next, 'getHistory');
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const { notification_id } = req.params;
    const notification = await userNotificationService.markAsRead(user_id, notification_id);
    return res.json({ success: true, data: notification, error: null });
  } catch (error) {
    return handleError(error, res, next, 'markAsRead');
  }
};


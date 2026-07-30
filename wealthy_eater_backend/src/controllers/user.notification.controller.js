const AppError = require('../utils/AppError');
const userNotificationService = require('../services/user.notification.service');

// ─── Shared error helper ──────────────────────────────────────────────────────
// NOTE: `next` is the 2nd parameter (not `res`) so Express error middleware
// is correctly invoked. All callers pass `next` from their own scope.
function handleError(err, next, context) {
  console.error(`[Notification Controller] ${context} error:`, err);
  if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
    return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
  }
  return next(new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR'));
}

exports.getSettings = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.getSettings(user_id);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, next, 'getSettings');
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.updateSettings(user_id, req.body);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, next, 'updateSettings');
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
    return handleError(error, next, 'getHistory');
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const { notification_id } = req.params;
    const notification = await userNotificationService.markAsRead(user_id, notification_id);
    return res.json({ success: true, data: notification, error: null });
  } catch (error) {
    return handleError(error, next, 'markAsRead');
  }
};


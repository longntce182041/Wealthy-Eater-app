const userNotificationService = require('../services/user.notification.service');

// ─── Shared response helper ──────────────────────────────────────────────────
function handleError(err, res, context) {
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }
  console.error(`[Notification Controller] ${context} error:`, err);
  return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

exports.getSettings = async (req, res) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.getSettings(user_id);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, res, 'getSettings');
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const settings = await userNotificationService.updateSettings(user_id, req.body);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    return handleError(error, res, 'updateSettings');
  }
};

exports.getHistory = async (req, res) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = parseInt(req.query.skip, 10) || 0;

    const history = await userNotificationService.getHistory(user_id, limit, skip);
    return res.json({ success: true, data: history, error: null });
  } catch (error) {
    return handleError(error, res, 'getHistory');
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const user_id = req.user.sub || req.user.id;
    const { notification_id } = req.params;
    const notification = await userNotificationService.markAsRead(user_id, notification_id);
    return res.json({ success: true, data: notification, error: null });
  } catch (error) {
    return handleError(error, res, 'markAsRead');
  }
};


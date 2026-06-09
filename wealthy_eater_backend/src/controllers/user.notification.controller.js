const userNotificationService = require('../services/user.notification.service');

exports.getSettings = async (req, res) => {
  try {
    const user_id = req.user.id;
    const settings = await userNotificationService.getSettings(user_id);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    console.error('[Notification Controller] getSettings error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const user_id = req.user.id;
    const settings = await userNotificationService.updateSettings(user_id, req.body);
    return res.json({ success: true, data: settings, error: null });
  } catch (error) {
    console.error('[Notification Controller] updateSettings error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const user_id = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = parseInt(req.query.skip, 10) || 0;

    const history = await userNotificationService.getHistory(user_id, limit, skip);
    return res.json({ success: true, data: history, error: null });
  } catch (error) {
    console.error('[Notification Controller] getHistory error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { notification_id } = req.params;
    const notification = await userNotificationService.markAsRead(user_id, notification_id);
    return res.json({ success: true, data: notification, error: null });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
    console.error('[Notification Controller] markAsRead error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
};

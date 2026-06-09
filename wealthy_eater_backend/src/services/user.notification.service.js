const NotificationSetting = require('../models/NotificationSetting');
const Notification = require('../models/Notification');

class UserNotificationService {
  /**
   * Get notification settings for a user. Creates default if not exists.
   */
  async getSettings(user_id) {
    let settings = await NotificationSetting.findOne({ user_id });
    if (!settings) {
      settings = await NotificationSetting.create({ user_id });
    }
    return settings;
  }

  /**
   * Update notification settings.
   */
  async updateSettings(user_id, updateData) {
    const allowedUpdates = {};

    // Validate is_push_enabled
    if (typeof updateData.is_push_enabled === 'boolean') {
      allowedUpdates.is_push_enabled = updateData.is_push_enabled;
    }

    // Validate water_reminder
    if (updateData.water_reminder && typeof updateData.water_reminder === 'object') {
      const wr = updateData.water_reminder;
      allowedUpdates.water_reminder = {
        enabled: typeof wr.enabled === 'boolean' ? wr.enabled : false,
        interval_minutes: typeof wr.interval_minutes === 'number' && wr.interval_minutes > 0 ? wr.interval_minutes : 120,
        start_time: typeof wr.start_time === 'string' && /^\d{2}:\d{2}$/.test(wr.start_time) ? wr.start_time : "08:00",
        end_time: typeof wr.end_time === 'string' && /^\d{2}:\d{2}$/.test(wr.end_time) ? wr.end_time : "20:00"
      };
    }

    // Validate meal_reminders
    if (Array.isArray(updateData.meal_reminders)) {
      const validMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
      allowedUpdates.meal_reminders = updateData.meal_reminders
        .filter(m => m && typeof m === 'object' && validMeals.includes(m.meal_type))
        .map(m => ({
          meal_type: m.meal_type,
          enabled: typeof m.enabled === 'boolean' ? m.enabled : false,
          time: typeof m.time === 'string' && /^\d{2}:\d{2}$/.test(m.time) ? m.time : "08:00"
        }))
        .slice(0, 4); // Prevent massive arrays
    }

    const settings = await NotificationSetting.findOneAndUpdate(
      { user_id },
      { $set: allowedUpdates },
      { new: true, upsert: true }
    );
    return settings;
  }

  /**
   * Fetch notification history for the user.
   */
  async getHistory(user_id, limit = 20, skip = 0) {
    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find({ user_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user_id }),
      Notification.countDocuments({ user_id, is_read: false })
    ]);

    return {
      notifications,
      totalCount,
      unreadCount,
    };
  }

  /**
   * Mark a specific notification as read.
   */
  async markAsRead(user_id, notification_id) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notification_id, user_id },
      { $set: { is_read: true } },
      { new: true }
    );
    if (!notification) {
      const error = new Error('Notification not found');
      error.code = 'NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }
    return notification;
  }
}

module.exports = new UserNotificationService();

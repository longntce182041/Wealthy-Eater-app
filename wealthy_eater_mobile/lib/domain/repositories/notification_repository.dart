import '../entities/notification.dart';

abstract class NotificationRepository {
  Future<NotificationSettingsEntity?> fetchSettings();
  Future<NotificationSettingsEntity> updateSettings(Map<String, dynamic> data);
  Future<NotificationHistoryEntity> fetchHistory({int limit = 20, int skip = 0});
  Future<void> markAsRead(String notificationId);
}

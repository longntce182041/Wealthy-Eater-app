import '../entities/notification.dart';
import '../repositories/notification_repository.dart';

class FetchNotificationSettingsUseCase {
  final NotificationRepository repository;
  FetchNotificationSettingsUseCase(this.repository);
  Future<NotificationSettingsEntity?> call() => repository.fetchSettings();
}

class UpdateNotificationSettingsUseCase {
  final NotificationRepository repository;
  UpdateNotificationSettingsUseCase(this.repository);
  Future<NotificationSettingsEntity> call(Map<String, dynamic> data) =>
      repository.updateSettings(data);
}

class FetchNotificationHistoryUseCase {
  final NotificationRepository repository;
  FetchNotificationHistoryUseCase(this.repository);
  Future<NotificationHistoryEntity> call({int limit = 20, int skip = 0}) =>
      repository.fetchHistory(limit: limit, skip: skip);
}

class MarkNotificationAsReadUseCase {
  final NotificationRepository repository;
  MarkNotificationAsReadUseCase(this.repository);
  Future<void> call(String notificationId) => repository.markAsRead(notificationId);
}

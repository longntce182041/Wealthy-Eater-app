import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/notification.dart';
import '../../domain/repositories/notification_repository.dart';

class NotificationRepositoryImpl implements NotificationRepository {
  final ApiClient apiClient;

  NotificationRepositoryImpl({required this.apiClient});

  @override
  Future<NotificationSettingsEntity?> fetchSettings() async {
    try {
      final res = await apiClient.get('/api/user/notifications/settings');
      if (res.statusCode == 200 && res.data['success'] == true) {
        final settings = res.data['data'] as Map<String, dynamic>?;
        if (settings != null) {
          return NotificationSettingsEntity(settings);
        }
      }
      return null;
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<NotificationSettingsEntity> updateSettings(Map<String, dynamic> data) async {
    try {
      final res = await apiClient.put('/api/user/notifications/settings', data: data);
      if (res.statusCode == 200 && res.data['success'] == true) {
        final settings = res.data['data'] as Map<String, dynamic>?;
        if (settings != null) {
          return NotificationSettingsEntity(settings);
        }
      }
      throw AppError('Failed to update settings');
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<NotificationHistoryEntity> fetchHistory({int limit = 20, int skip = 0}) async {
    try {
      final res = await apiClient.get('/api/user/notifications/history', queryParameters: {
        'limit': limit,
        'skip': skip,
      });
      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'];
        return NotificationHistoryEntity(
          notifications: List<dynamic>.from(data['notifications'] ?? []),
          unreadCount: (data['unreadCount'] as num?)?.toInt() ?? 0,
        );
      }
      throw AppError('Failed to fetch history');
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    try {
      await apiClient.patch('/api/user/notifications/$notificationId/read');
    } catch (e) {
      throw mapError(e);
    }
  }
}

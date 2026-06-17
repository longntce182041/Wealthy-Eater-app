class NotificationSettingsEntity {
  final Map<String, dynamic> data;

  const NotificationSettingsEntity(this.data);
}

class NotificationHistoryEntity {
  final List<dynamic> notifications;
  final int unreadCount;

  const NotificationHistoryEntity({
    required this.notifications,
    required this.unreadCount,
  });
}

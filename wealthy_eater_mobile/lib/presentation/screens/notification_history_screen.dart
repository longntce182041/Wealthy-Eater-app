import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

class NotificationHistoryScreen extends StatelessWidget {
  const NotificationHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
      ),
      body: Consumer<NotificationProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.history.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.history.isEmpty) {
            return const Center(
              child: Text('No notifications yet.'),
            );
          }

          return ListView.builder(
            itemCount: provider.history.length,
            itemBuilder: (context, index) {
              final notification = provider.history[index];
              final isRead = notification['is_read'] == true;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: isRead ? Colors.grey.shade200 : Theme.of(context).colorScheme.primaryContainer,
                  child: Icon(
                    _getIconForType(notification['type']),
                    color: isRead ? Colors.grey : Theme.of(context).colorScheme.primary,
                  ),
                ),
                title: Text(
                  notification['title'] ?? '',
                  style: TextStyle(
                    fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                  ),
                ),
                subtitle: Text(notification['body'] ?? ''),
                onTap: () {
                  if (!isRead) {
                    provider.markAsRead(notification['_id']);
                  }
                  // Optionally navigate to details depending on type
                },
              );
            },
          );
        },
      ),
    );
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'consultation':
        return Icons.medical_services_outlined;
      case 'reminder':
        return Icons.alarm;
      default:
        return Icons.notifications_outlined;
    }
  }
}

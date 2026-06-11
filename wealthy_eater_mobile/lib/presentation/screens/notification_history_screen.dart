import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/water_reminder_card.dart';
import '../widgets/meal_reminder_card.dart';
import 'transaction_detail_screen.dart';

class NotificationHistoryScreen extends StatefulWidget {
  const NotificationHistoryScreen({super.key});

  @override
  State<NotificationHistoryScreen> createState() => _NotificationHistoryScreenState();
}

class _NotificationHistoryScreenState extends State<NotificationHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<NotificationProvider>(context, listen: false);
      if (provider.settings == null) {
        provider.fetchSettings();
      }
      provider.fetchHistory();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Notifications & Reminders'),
          bottom: TabBar(
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: theme.colorScheme.primary,
            tabs: const [
              Tab(
                icon: Icon(Icons.alarm_outlined),
                text: 'Reminders',
              ),
              Tab(
                icon: Icon(Icons.history_outlined),
                text: 'History',
              ),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _RemindersTab(),
            _HistoryTab(),
          ],
        ),
      ),
    );
  }
}

class _RemindersTab extends StatelessWidget {
  const _RemindersTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Selector<NotificationProvider, _RemindersStateData>(
      selector: (_, provider) => _RemindersStateData(
        isLoading: provider.isLoading && provider.settings == null,
        isPushEnabled: provider.settings?['is_push_enabled'] ?? true,
      ),
      builder: (context, data, child) {
        if (data.isLoading) {
          return const Center(
            child: CircularProgressIndicator(),
          );
        }

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          children: [
            // Allow Push Notifications Card
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                clipBehavior: Clip.antiAlias,
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: SwitchListTile(
                  secondary: CircleAvatar(
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.12),
                    child: Icon(Icons.notifications_active_outlined, color: theme.colorScheme.primary),
                  ),
                  title: const Text(
                    'Allow Push Notifications',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  subtitle: const Text(
                    'Receive alerts, consultation updates, and reminders.',
                    style: TextStyle(fontSize: 12),
                  ),
                  value: data.isPushEnabled,
                  activeThumbColor: theme.colorScheme.primary,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (val) {
                    context.read<NotificationProvider>().updateSettings({'is_push_enabled': val});
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

            // Daily Reminders Header
            Row(
              children: [
                Text(
                  'DAILY REMINDERS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade600,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Reminders Sub-cards (Water + Meals)
            Opacity(
              opacity: data.isPushEnabled ? 1.0 : 0.55,
              child: IgnorePointer(
                ignoring: !data.isPushEnabled,
                child: Column(
                  children: [
                    const WaterReminderCard(),
                    const SizedBox(height: 16),
                    MealReminderCard(isPushEnabled: data.isPushEnabled),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _RemindersStateData {
  final bool isLoading;
  final bool isPushEnabled;

  _RemindersStateData({required this.isLoading, required this.isPushEnabled});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is _RemindersStateData &&
          runtimeType == other.runtimeType &&
          isLoading == other.isLoading &&
          isPushEnabled == other.isPushEnabled;

  @override
  int get hashCode => isLoading.hashCode ^ isPushEnabled.hashCode;
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
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
          padding: const EdgeInsets.symmetric(vertical: 8),
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

                // If it's a transaction, navigate to detail screen
                if (notification['type'] == 'transaction' &&
                    notification['metadata'] != null &&
                    notification['metadata']['transaction_id'] != null) {
                  final txId = notification['metadata']['transaction_id'];
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => TransactionDetailScreen(transactionId: txId),
                    ),
                  );
                }
              },
            );
          },
        );
      },
    );
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'transaction':
        return Icons.receipt_long;
      case 'consultation':
        return Icons.medical_services_outlined;
      case 'reminder':
        return Icons.alarm;
      default:
        return Icons.notifications_outlined;
    }
  }
}


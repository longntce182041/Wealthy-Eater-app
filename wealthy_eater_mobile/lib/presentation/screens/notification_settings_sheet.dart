import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/water_reminder_card.dart';
import '../widgets/meal_reminder_card.dart';

class NotificationSettingsSheet extends StatefulWidget {
  const NotificationSettingsSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: const Color.fromARGB(255, 247, 250, 245),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const NotificationSettingsSheet(),
    );
  }

  @override
  State<NotificationSettingsSheet> createState() => _NotificationSettingsSheetState();
}

class _NotificationSettingsSheetState extends State<NotificationSettingsSheet> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<NotificationProvider>(context, listen: false);
      if (provider.settings == null) {
        provider.fetchSettings();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // We only listen to isLoading and isPushEnabled to avoid full rebuilds
    return Selector<NotificationProvider, _SheetStateData>(
      selector: (_, provider) => _SheetStateData(
        isLoading: provider.isLoading && provider.settings == null,
        isPushEnabled: provider.settings?['is_push_enabled'] ?? true,
      ),
      builder: (context, data, child) {
        if (data.isLoading) {
          return const SizedBox(
            height: 350,
            child: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.6,
          expand: false,
          builder: (context, scrollController) {
            return ListView(
              controller: scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              children: [
                // Pull handle
                Center(
                  child: Container(
                    width: 36,
                    height: 5,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2.5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Notification Settings',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.tertiary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Manage your daily reminders and alerts',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(context),
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.grey.shade200,
                        foregroundColor: Colors.grey.shade700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Card 1: Allow Push Notifications
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
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
                const SizedBox(height: 24),

                // Title Section: Reminders
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
                const SizedBox(height: 8),

                // Card 2 & 3: Water Reminders and Meal Reminders
                // Wrap in Opacity & IgnorePointer if Push Notifications is disabled
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
      },
    );
  }
}

class _SheetStateData {
  final bool isLoading;
  final bool isPushEnabled;

  _SheetStateData({required this.isLoading, required this.isPushEnabled});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is _SheetStateData &&
          runtimeType == other.runtimeType &&
          isLoading == other.isLoading &&
          isPushEnabled == other.isPushEnabled;

  @override
  int get hashCode => isLoading.hashCode ^ isPushEnabled.hashCode;
}

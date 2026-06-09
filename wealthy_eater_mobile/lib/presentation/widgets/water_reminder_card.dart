import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

class WaterReminderCard extends StatelessWidget {
  const WaterReminderCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Selector<NotificationProvider, Map<String, dynamic>>(
      selector: (_, provider) => provider.settings?['water_reminder'] ?? {},
      builder: (context, waterReminder, child) {
        final isEnabled = waterReminder['enabled'] == true;
        
        return Container(
          padding: const EdgeInsets.all(16),
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.blue.withValues(alpha: 0.12),
                    child: const Icon(Icons.water_drop_outlined, color: Colors.blue, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Water Reminders',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          'Track your hydration goals',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: isEnabled,
                    activeThumbColor: theme.colorScheme.primary,
                    onChanged: (val) {
                      final provider = context.read<NotificationProvider>();
                      final newWater = Map<String, dynamic>.from(waterReminder);
                      newWater['enabled'] = val;
                      provider.updateSettings({'water_reminder': newWater});
                    },
                  ),
                ],
              ),
              if (isEnabled) ...[
                const SizedBox(height: 16),
                const Divider(height: 1),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildTimeSelector(
                        context: context,
                        label: 'Start Time',
                        time: waterReminder['start_time'] ?? '08:00',
                        onTap: () {
                          _selectTime(context, waterReminder['start_time'] ?? '08:00', (newTime) {
                            final provider = context.read<NotificationProvider>();
                            final newWater = Map<String, dynamic>.from(waterReminder);
                            newWater['start_time'] = newTime;
                            provider.updateSettings({'water_reminder': newWater});
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTimeSelector(
                        context: context,
                        label: 'End Time',
                        time: waterReminder['end_time'] ?? '20:00',
                        onTap: () {
                          _selectTime(context, waterReminder['end_time'] ?? '20:00', (newTime) {
                            final provider = context.read<NotificationProvider>();
                            final newWater = Map<String, dynamic>.from(waterReminder);
                            newWater['end_time'] = newTime;
                            provider.updateSettings({'water_reminder': newWater});
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.timer_outlined, size: 20, color: Colors.grey.shade600),
                        const SizedBox(width: 8),
                        const Text(
                          'Frequency',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    DropdownButton<int>(
                      value: int.tryParse(waterReminder['interval_minutes']?.toString() ?? '120') ?? 120,
                      underline: const SizedBox(),
                      borderRadius: BorderRadius.circular(12),
                      style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      items: const [
                        DropdownMenuItem(value: 30, child: Text('Every 30 mins')),
                        DropdownMenuItem(value: 60, child: Text('Every 1 hour')),
                        DropdownMenuItem(value: 90, child: Text('Every 1.5 hours')),
                        DropdownMenuItem(value: 120, child: Text('Every 2 hours')),
                        DropdownMenuItem(value: 180, child: Text('Every 3 hours')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          final provider = context.read<NotificationProvider>();
                          final newWater = Map<String, dynamic>.from(waterReminder);
                          newWater['interval_minutes'] = val;
                          provider.updateSettings({'water_reminder': newWater});
                        }
                      },
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildTimeSelector({
    required BuildContext context,
    required String label,
    required String time,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          border: Border.all(color: Colors.grey.shade200),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(
              Icons.access_time_rounded,
              size: 20,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey.shade500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    time,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.tertiary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_drop_down,
              size: 18,
              color: Colors.grey.shade500,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _selectTime(BuildContext context, String currentTime, ValueChanged<String> onTimeSelected) async {
    final parts = currentTime.split(':');
    final initialTime = TimeOfDay(
      hour: parts.isNotEmpty ? int.tryParse(parts[0]) ?? 8 : 8,
      minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
    );
    final picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
    );
    if (picked != null) {
      final hh = picked.hour.toString().padLeft(2, '0');
      final mm = picked.minute.toString().padLeft(2, '0');
      onTimeSelected('$hh:$mm');
    }
  }
}

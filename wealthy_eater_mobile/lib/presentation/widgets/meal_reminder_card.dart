import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

class MealReminderCard extends StatelessWidget {
  final bool isPushEnabled;
  
  const MealReminderCard({super.key, required this.isPushEnabled});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Selector<NotificationProvider, List<dynamic>>(
      selector: (_, provider) => (provider.settings?['meal_reminders'] as List?) ?? [],
      builder: (context, meals, child) {
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
                    backgroundColor: theme.colorScheme.secondary.withValues(alpha: 0.12),
                    child: Icon(Icons.restaurant_menu_outlined, color: theme.colorScheme.secondary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Meal Reminders',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        Text(
                          'Schedule alerts for eating intervals',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 8),
              ..._buildMealReminders(context, meals, isPushEnabled),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _buildMealReminders(BuildContext context, List<dynamic> meals, bool isPushEnabled) {
    final theme = Theme.of(context);
    final defaultMeals = ['breakfast', 'lunch', 'dinner', 'snack'];
    final mealMap = { for (var item in meals) item['meal_type']: item };

    final mealIcons = {
      'breakfast': Icons.wb_sunny_outlined,
      'lunch': Icons.lunch_dining_outlined,
      'dinner': Icons.dinner_dining_outlined,
      'snack': Icons.cookie_outlined,
    };

    return defaultMeals.map((mealType) {
      final mealData = mealMap[mealType] ?? {'meal_type': mealType, 'enabled': false, 'time': '08:00'};
      final isEnabled = mealData['enabled'] == true;
      final mealIcon = mealIcons[mealType] ?? Icons.restaurant_menu_outlined;

      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: isEnabled
                  ? theme.colorScheme.primary.withValues(alpha: 0.12)
                  : Colors.grey.shade100,
              child: Icon(
                mealIcon,
                size: 16,
                color: isEnabled
                    ? theme.colorScheme.primary
                    : Colors.grey.shade400,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                mealType[0].toUpperCase() + mealType.substring(1),
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isEnabled ? Colors.black87 : Colors.grey.shade500,
                ),
              ),
            ),
            if (isEnabled) ...[
              GestureDetector(
                onTap: !isPushEnabled ? null : () {
                  _selectTime(context, mealData['time'] ?? '08:00', (newTime) {
                    final provider = context.read<NotificationProvider>();
                    final newMeal = Map<String, dynamic>.from(mealData);
                    newMeal['time'] = newTime;
                    final newMeals = defaultMeals.map((m) {
                      if (m == mealType) return newMeal;
                      return mealMap[m] ?? {'meal_type': m, 'enabled': false};
                    }).toList();
                    provider.updateSettings({'meal_reminders': newMeals});
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.08),
                    border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.2)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time_rounded, size: 13, color: theme.colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        mealData['time'] ?? '08:00',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
            ],
            Switch(
              value: isEnabled,
              activeThumbColor: theme.colorScheme.primary,
              onChanged: !isPushEnabled
                  ? null
                  : (val) {
                      final provider = context.read<NotificationProvider>();
                      final newMeal = Map<String, dynamic>.from(mealData);
                      newMeal['enabled'] = val;
                      final newMeals = defaultMeals.map((m) {
                        if (m == mealType) return newMeal;
                        return mealMap[m] ?? {'meal_type': m, 'enabled': false};
                      }).toList();
                      provider.updateSettings({'meal_reminders': newMeals});
                    },
            ),
          ],
        ),
      );
    }).toList();
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

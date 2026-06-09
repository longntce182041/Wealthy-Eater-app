import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

import '../../core/network/api_client.dart';
import '../../core/error/app_error.dart';

class NotificationProvider with ChangeNotifier {
  final ApiClient _api;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin;

  Map<String, dynamic>? settings;
  List<dynamic> history = [];
  int unreadCount = 0;
  bool isLoading = false;
  String? errorMessage;

  NotificationProvider({required ApiClient api})
      : _api = api,
        _localNotificationsPlugin = FlutterLocalNotificationsPlugin() {
    _initLocalNotifications();
  }

  Future<void> _initLocalNotifications() async {
    tz.initializeTimeZones();

    try {
      final timeZoneName = DateTime.now().timeZoneName;
      if (timeZoneName.contains('/') || timeZoneName == 'UTC') {
        tz.setLocalLocation(tz.getLocation(timeZoneName));
      } else {
        final offsetHours = DateTime.now().timeZoneOffset.inHours;
        String locationName = 'UTC';
        switch (offsetHours) {
          case 7:
            locationName = 'Asia/Saigon';
            break;
          case 8:
            locationName = 'Asia/Singapore';
            break;
          case 9:
            locationName = 'Asia/Tokyo';
            break;
          case 0:
            locationName = 'UTC';
            break;
          case 1:
            locationName = 'Europe/Paris';
            break;
          case 2:
            locationName = 'Europe/Kyiv';
            break;
          case 3:
            locationName = 'Europe/Moscow';
            break;
          case -5:
            locationName = 'America/New_York';
            break;
          case -6:
            locationName = 'America/Chicago';
            break;
          case -7:
            locationName = 'America/Denver';
            break;
          case -8:
            locationName = 'America/Los_Angeles';
            break;
          default:
            locationName = 'UTC';
        }
        tz.setLocalLocation(tz.getLocation(locationName));
      }
    } catch (_) {
      tz.setLocalLocation(tz.UTC);
    }

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);
    await _localNotificationsPlugin.initialize(initSettings);

    final androidImpl = _localNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidImpl != null) {
      await androidImpl.requestNotificationsPermission();
      await androidImpl.requestExactAlarmsPermission();
    }
  }

  void _setLoading(bool value) {
    isLoading = value;
    notifyListeners();
  }

  void _setError(String message) {
    errorMessage = message;
    isLoading = false;
    notifyListeners();
  }

  Future<void> fetchSettings() async {
    _setLoading(true);
    try {
      final res = await _api.get('/api/user/notifications/settings');
      if (res.statusCode == 200 && res.data['success'] == true) {
        settings = res.data['data'] as Map<String, dynamic>?;
        errorMessage = null;
        _scheduleLocalReminders();
      } else {
        _setError(res.data['error']?['message'] ?? 'Failed to fetch settings');
      }
    } catch (e) {
      _setError(mapError(e).message);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> updateSettings(Map<String, dynamic> data) async {
    _setLoading(true);
    try {
      final res = await _api.put('/api/user/notifications/settings', data: data);
      if (res.statusCode == 200 && res.data['success'] == true) {
        settings = res.data['data'] as Map<String, dynamic>?;
        errorMessage = null;
        _scheduleLocalReminders();
      } else {
        _setError(res.data['error']?['message'] ?? 'Failed to update settings');
      }
    } catch (e) {
      _setError(mapError(e).message);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> fetchHistory({int limit = 20, int skip = 0}) async {
    _setLoading(true);
    try {
      final res = await _api.get('/api/user/notifications/history', queryParameters: {
        'limit': limit,
        'skip': skip,
      });
      if (res.statusCode == 200 && res.data['success'] == true) {
        final data = res.data['data'];
        history = List<dynamic>.from(data['notifications'] ?? []);
        unreadCount = data['unreadCount'] ?? 0;
        errorMessage = null;
      } else {
        _setError(res.data['error']?['message'] ?? 'Failed to fetch history');
      }
    } catch (e) {
      _setError(mapError(e).message);
    } finally {
      _setLoading(false);
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      final res = await _api.patch('/api/user/notifications/$notificationId/read');
      if (res.statusCode == 200 && res.data['success'] == true) {
        // Update local history list
        final index = history.indexWhere((n) => n['_id'] == notificationId);
        if (index != -1) {
          history[index]['is_read'] = true;
          if (unreadCount > 0) unreadCount--;
          notifyListeners();
        }
      }
    } catch (e) {
      // Background fail
      debugPrint('Failed to mark notification as read: $e');
    }
  }

  Future<void> _scheduleLocalReminders() async {
    await _localNotificationsPlugin.cancelAll();

    if (settings == null) return;
    final isPushEnabled = settings!['is_push_enabled'] ?? true;
    if (!isPushEnabled) return;

    // Water Reminders
    final waterReminder = settings!['water_reminder'];
    if (waterReminder != null && waterReminder['enabled'] == true) {
      final startParts = waterReminder['start_time']?.toString().split(':') ?? ['08', '00'];
      final endParts = waterReminder['end_time']?.toString().split(':') ?? ['20', '00'];
      if (startParts.length == 2 && startParts.length == endParts.length) {
        final startHour = int.tryParse(startParts[0]) ?? 8;
        final startMin = int.tryParse(startParts[1]) ?? 0;
        final endHour = int.tryParse(endParts[0]) ?? 20;
        final endMin = int.tryParse(endParts[1]) ?? 0;

        final startTotal = startHour * 60 + startMin;
        final endTotal = endHour * 60 + endMin;

        // Default to 120 minutes (2 hours) if not specified
        final intervalMinutes = waterReminder['interval_minutes'] as int? ?? 120;

        int idCounter = 100;
        for (int minutes = startTotal; minutes <= endTotal; minutes += intervalMinutes) {
          final currentHour = minutes ~/ 60;
          final currentMin = minutes % 60;
          await _scheduleDailyAtTime(
            idCounter++,
            'Water Reminder 💧',
            'Time to drink a glass of water and stay hydrated!',
            currentHour,
            currentMin,
          );
        }
      }
    }

    // Meal Reminders
    final mealReminders = settings!['meal_reminders'] as List?;
    if (mealReminders != null) {
      for (var i = 0; i < mealReminders.length; i++) {
        final meal = mealReminders[i];
        if (meal['enabled'] == true && meal['time'] != null) {
          final parts = meal['time'].toString().split(':');
          if (parts.length == 2) {
            final hour = int.tryParse(parts[0]) ?? 8;
            final min = int.tryParse(parts[1]) ?? 0;
            _scheduleDailyAtTime(i + 1, 'Meal Reminder', 'Time for your ${meal["meal_type"]}', hour, min);
          }
        }
      }
    }
  }

  Future<void> _scheduleDailyAtTime(int id, String title, String body, int hour, int minute) async {
    final now = tz.TZDateTime.now(tz.local);
    var scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, hour, minute);
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }

    const androidDetails = AndroidNotificationDetails(
      'wealthy_eater_reminders',
      'Reminders',
      channelDescription: 'Local reminders for meals and water',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    final androidImpl = _localNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    final canExact = (await androidImpl?.canScheduleExactNotifications()) ?? false;
    final scheduleMode = canExact
        ? AndroidScheduleMode.exactAllowWhileIdle
        : AndroidScheduleMode.inexact;

    await _localNotificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      scheduledDate,
      details,
      androidScheduleMode: scheduleMode,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }
}

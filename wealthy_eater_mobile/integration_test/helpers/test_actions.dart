import 'package:flutter_test/flutter_test.dart';
import 'package:wealthy_eater_mobile/presentation/widgets/custom_text_field.dart';
import 'package:wealthy_eater_mobile/presentation/widgets/custom_elevated_button.dart';
import 'test_config.dart';

class TestActions {
  /// Đăng nhập bằng tài khoản Customer
  static Future<void> loginAsCustomer(WidgetTester tester) async {
    final emailField = find.byType(CustomTextField).first;
    final passwordField = find.byType(CustomTextField).last;
    final loginButton = find.byType(CustomElevatedButton).first;

    await tester.enterText(emailField, TestConfig.customerEmail);
    await tester.enterText(passwordField, TestConfig.customerPassword);
    await tester.pumpAndSettle();

    await tester.tap(loginButton);
    await waitUntilSettleTimeout(tester);
  }

  /// Đăng nhập bằng tài khoản Nutritionist
  static Future<void> loginAsNutritionist(WidgetTester tester) async {
    // Tìm và nhấn nút chuyển sang Nutritionist Login
    final nutritionistLoginLink = find.text('Nutritionist Login');
    expect(nutritionistLoginLink, findsOneWidget);
    await tester.tap(nutritionistLoginLink);
    await tester.pumpAndSettle();

    // Điền thông tin đăng nhập
    final emailField = find.byType(CustomTextField).first;
    final passwordField = find.byType(CustomTextField).last;
    final loginButton = find.byType(CustomElevatedButton).first;

    await tester.enterText(emailField, TestConfig.nutritionistEmail);
    await tester.enterText(passwordField, TestConfig.nutritionistPassword);
    await tester.pumpAndSettle();

    await tester.tap(loginButton);
    await waitUntilSettleTimeout(tester);
  }

  /// Smart Wait: Đợi cho đến khi widget xuất hiện (thay cho việc dùng Delay cứng)
  static Future<void> waitUntilVisible(WidgetTester tester, Finder finder, {int timeoutSeconds = 5}) async {
    final endTime = DateTime.now().add(Duration(seconds: timeoutSeconds));
    while (DateTime.now().isBefore(endTime)) {
      await tester.pump(const Duration(milliseconds: 500));
      if (finder.evaluate().isNotEmpty) {
        return;
      }
    }
    throw Exception('Timeout waiting for element: ${finder.description}');
  }
  
  /// Chờ API phản hồi thông minh, tránh vô hạn loading (Timeout sau 10s)
  static Future<void> waitUntilSettleTimeout(WidgetTester tester) async {
      int count = 0;
      do {
        await tester.pump(const Duration(milliseconds: 500));
        count++;
      } while (tester.binding.hasScheduledFrame && count < 20); // 10s timeout
  }
}

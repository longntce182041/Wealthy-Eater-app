import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Bot & Notifications UI Tests', () {
    testWidgets('TC-UI-012: Check Notifications and Chatbot', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final notifIcon = find.byIcon(Icons.notifications_outlined);
      if (notifIcon.evaluate().isNotEmpty) {
        await tester.tap(notifIcon.first);
        await TestActions.waitUntilSettleTimeout(tester);
        
        final backButton = find.byIcon(Icons.arrow_back);
        if (backButton.evaluate().isNotEmpty) {
          await tester.tap(backButton.first);
          await tester.pumpAndSettle();
        }
      }

      final chatIcon = find.byIcon(Icons.smart_toy_outlined);
      if (chatIcon.evaluate().isNotEmpty) {
        await tester.tap(chatIcon.first);
        await TestActions.waitUntilSettleTimeout(tester);
      }
    });
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Main Dashboard E2E Tests', () {
    testWidgets('TC-UI-005: Dashboard Navigation', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final recipesTab = find.text('Recipes');
      if (recipesTab.evaluate().isNotEmpty) {
        await tester.tap(recipesTab);
        await tester.pumpAndSettle();
      }

      final plansTab = find.text('Plans');
      if (plansTab.evaluate().isNotEmpty) {
        await tester.tap(plansTab);
        await tester.pumpAndSettle();
      }

      final profileTab = find.text('Profile');
      if (profileTab.evaluate().isNotEmpty) {
        await tester.tap(profileTab);
        await tester.pumpAndSettle();
      }
    });
  });
}

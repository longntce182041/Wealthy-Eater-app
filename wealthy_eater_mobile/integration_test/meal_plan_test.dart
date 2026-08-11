import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Meal Plan UI Tests', () {
    testWidgets('TC-UI-010: View Meal Plans', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final plansTab = find.text('Plans');
      if (plansTab.evaluate().isNotEmpty) {
        await tester.tap(plansTab);
        await TestActions.waitUntilSettleTimeout(tester);
      }
    });
  });
}

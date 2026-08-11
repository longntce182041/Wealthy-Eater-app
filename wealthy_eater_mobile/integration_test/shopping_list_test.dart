import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Shopping List UI Tests', () {
    testWidgets('TC-UI-009: View Shopping List', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final recipesTab = find.text('Recipes');
      if (recipesTab.evaluate().isNotEmpty) {
        await tester.tap(recipesTab);
        await tester.pumpAndSettle();

        final shoppingSubTab = find.text('Shopping');
        if (shoppingSubTab.evaluate().isNotEmpty) {
          await tester.tap(shoppingSubTab);
          await TestActions.waitUntilSettleTimeout(tester);
        }
      }
    });
  });
}

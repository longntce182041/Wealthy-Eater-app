import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Recipe & Meal Plan Interaction E2E Tests', () {
    testWidgets('TC-UI-006: Browse Recipes and Sub-Tabs', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final recipesTab = find.text('Recipes');
      if (recipesTab.evaluate().isNotEmpty) {
        await tester.tap(recipesTab);
        await tester.pumpAndSettle();

        final shoppingTab = find.text('Shopping');
        if (shoppingTab.evaluate().isNotEmpty) {
           await tester.tap(shoppingTab);
           await tester.pumpAndSettle();
        }

        final aiSavedTab = find.text('AI Saved');
        if (aiSavedTab.evaluate().isNotEmpty) {
           await tester.tap(aiSavedTab);
           await tester.pumpAndSettle();
        }
      }
    });
  });
}

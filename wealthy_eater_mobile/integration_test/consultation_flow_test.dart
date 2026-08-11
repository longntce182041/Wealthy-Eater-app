import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Consultation Flow UI Tests', () {
    testWidgets('TC-UI-011: Navigate to Nutritionists List', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final nutritionistsTab = find.text('Nutritionists');
      if (nutritionistsTab.evaluate().isNotEmpty) {
        await tester.tap(nutritionistsTab);
        await TestActions.waitUntilSettleTimeout(tester);
      }
    });
  });
}

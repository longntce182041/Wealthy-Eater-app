import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Pantry UI Tests', () {
    testWidgets('TC-UI-008: Navigate to Pantry', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      final pantryCard = find.textContaining('Manage your pantry ingredients');
      if (pantryCard.evaluate().isNotEmpty) {
        await tester.tap(pantryCard);
        await TestActions.waitUntilVisible(tester, find.text('My Pantry', skipOffstage: false));
      }
    });
  });
}

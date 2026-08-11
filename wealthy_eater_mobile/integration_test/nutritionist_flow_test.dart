import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Nutritionist Flow E2E Tests', () {
    testWidgets('TC-UI-004: Navigate to Nutritionist Dashboard', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsNutritionist(tester);

      final clientsTab = find.text('Clients');
      if (clientsTab.evaluate().isNotEmpty) {
        await tester.tap(clientsTab);
        await tester.pumpAndSettle();

        final profileTab = find.text('Profile');
        await tester.tap(profileTab);
        await tester.pumpAndSettle();

        expect(find.text('Change Password'), findsWidgets);
      }
    });
  });
}

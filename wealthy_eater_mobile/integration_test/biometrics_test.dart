import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'helpers/test_actions.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Biometrics UI Tests', () {
    testWidgets('TC-UI-007: Navigate to Edit Biometrics', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      await TestActions.loginAsCustomer(tester);

      // Go to Profile Tab
      final profileTab = find.text('Profile');
      if (profileTab.evaluate().isNotEmpty) {
        await tester.tap(profileTab);
        await tester.pumpAndSettle();

        final biometricsMenu = find.textContaining('Biometrics');
        if (biometricsMenu.evaluate().isNotEmpty) {
          await tester.tap(biometricsMenu.first);
          await TestActions.waitUntilSettleTimeout(tester);
        }
      }
    });
  });
}

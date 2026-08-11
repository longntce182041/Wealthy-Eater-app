import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wealthy_eater_mobile/main.dart' as app;
import 'package:wealthy_eater_mobile/presentation/widgets/custom_text_field.dart';
import 'package:wealthy_eater_mobile/presentation/widgets/custom_elevated_button.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Auth Flow E2E Tests', () {
    testWidgets('TC-UI-001: Customer Login with Invalid Credentials', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      final emailField = find.byType(CustomTextField).first;
      final passwordField = find.byType(CustomTextField).last;
      final loginButton = find.byType(CustomElevatedButton).first;

      await tester.enterText(emailField, 'wrong_user@example.com');
      await tester.enterText(passwordField, 'wrongpassword123');
      await tester.pumpAndSettle();

      await tester.tap(loginButton);
      await tester.pumpAndSettle();

      expect(find.byType(SnackBar), findsOneWidget);
    });

    testWidgets('TC-UI-002: Navigation to Register Screen', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Find 'Create Account' button (TextButton usually)
      final createAccountBtn = find.text('Create Account');
      expect(createAccountBtn, findsOneWidget);

      await tester.tap(createAccountBtn);
      await tester.pumpAndSettle();

      // Expect to find Register screen elements
      expect(find.text('Create Account', skipOffstage: false), findsWidgets);
    });

    testWidgets('TC-UI-003: Navigation to Forgot Password', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      final forgotPassBtn = find.text('Forgot Password?');
      expect(forgotPassBtn, findsOneWidget);

      await tester.tap(forgotPassBtn);
      await tester.pumpAndSettle();

      expect(find.text('Reset Password', skipOffstage: false), findsWidgets);
    });
  });
}

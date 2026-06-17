import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:wealthy_eater_mobile/main.dart';

void main() {
  testWidgets('Splash screen smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const WealthyEaterApp());

    // Verify that the splash screen shows Wealthy Eater name
    expect(find.text('Wealthy Eater'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}


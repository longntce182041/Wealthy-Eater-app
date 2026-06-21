import 'package:flutter/material.dart';
import 'package:google_sign_in_platform_interface/google_sign_in_platform_interface.dart';
import 'package:google_sign_in_web/google_sign_in_web.dart' as web;

class GoogleSignInButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isLoading;

  const GoogleSignInButton({
    super.key,
    required this.onPressed,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final googleSignInPlugin = GoogleSignInPlatform.instance as web.GoogleSignInPlugin;
    return SizedBox(
      height: 48,
      width: double.infinity,
      child: Center(
        child: googleSignInPlugin.renderButton(
          configuration: web.GSIButtonConfiguration(
            type: web.GSIButtonType.standard,
            shape: web.GSIButtonShape.rectangular,
            size: web.GSIButtonSize.large,
            theme: web.GSIButtonTheme.outline,
          ),
        ),
      ),
    );
  }
}

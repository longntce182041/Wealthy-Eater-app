import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../providers/auth_provider.dart';
import '../widgets/custom_elevated_button.dart';
import '../widgets/custom_text_field.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _oldPasswordCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Re-build screen as user types to evaluate validation and enable/disable submit button
    _oldPasswordCtrl.addListener(_updateState);
    _newPasswordCtrl.addListener(_updateState);
    _confirmPasswordCtrl.addListener(_updateState);
  }

  void _updateState() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _oldPasswordCtrl.dispose();
    _newPasswordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  bool get _isFormValid {
    final oldPass = _oldPasswordCtrl.text;
    final newPass = _newPasswordCtrl.text;
    final confirmPass = _confirmPasswordCtrl.text;

    if (oldPass.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
      return false;
    }
    if (newPass.length < 6) {
      return false;
    }
    if (oldPass == newPass) {
      return false;
    }
    if (newPass != confirmPass) {
      return false;
    }
    return true;
  }

  String? get _newPasswordError {
    final newPass = _newPasswordCtrl.text;
    if (newPass.isNotEmpty && newPass.length < 6) {
      return 'New password must be at least 6 characters';
    }
    final oldPass = _oldPasswordCtrl.text;
    if (newPass.isNotEmpty && oldPass.isNotEmpty && newPass == oldPass) {
      return 'New password cannot be the same as current password';
    }
    return null;
  }

  String? get _confirmPasswordError {
    final newPass = _newPasswordCtrl.text;
    final confirmPass = _confirmPasswordCtrl.text;
    if (confirmPass.isNotEmpty && newPass != confirmPass) {
      return 'Confirm password does not match new password';
    }
    return null;
  }

  Future<void> _doChangePassword() async {
    if (!_isFormValid) return;

    setState(() => _isSubmitting = true);

    final auth = context.read<AuthProvider>();
    final success = await auth.changePassword(
      _oldPasswordCtrl.text,
      _newPasswordCtrl.text,
    );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      // Show success dialog
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('Success'),
            ],
          ),
          content: const Text('Password changed successfully!'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop(); // pop dialog
                Navigator.of(context).pop(); // pop change password screen (redirect back to profile settings)
              },
              child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      // Show error Snack bar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.errorMessage ?? 'Incorrect current password or an error occurred.'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isBtnEnabled = _isFormValid;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Change Password'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Set New Password',
                style: AppTextStyles.headlineMedium.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'To secure your account, please enter your current password and new password below.',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 32),

              // Old Password Input
              CustomTextField(
                controller: _oldPasswordCtrl,
                labelText: 'Current Password',
                hintText: 'Enter current password',
                isPassword: true,
                prefixIcon: Icons.lock_outline,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 20),

              // New Password Input
              CustomTextField(
                controller: _newPasswordCtrl,
                labelText: 'New Password',
                hintText: 'Enter new password',
                isPassword: true,
                prefixIcon: Icons.lock_open_outlined,
                textInputAction: TextInputAction.next,
              ),
              if (_newPasswordError != null) ...[
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Text(
                    _newPasswordError!,
                    style: const TextStyle(color: AppColors.error, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 20),

              // Confirm Password Input
              CustomTextField(
                controller: _confirmPasswordCtrl,
                labelText: 'Confirm New Password',
                hintText: 'Re-enter new password',
                isPassword: true,
                prefixIcon: Icons.lock_reset_outlined,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) {
                  if (isBtnEnabled && !_isSubmitting) {
                    _doChangePassword();
                  }
                },
              ),
              if (_confirmPasswordError != null) ...[
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Text(
                    _confirmPasswordError!,
                    style: const TextStyle(color: AppColors.error, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 32),

              // Action Button
              CustomElevatedButton(
                label: 'Update Password',
                onPressed: isBtnEnabled ? _doChangePassword : null,
                isLoading: _isSubmitting,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

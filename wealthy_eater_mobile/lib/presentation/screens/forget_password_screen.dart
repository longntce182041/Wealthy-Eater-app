import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../widgets/custom_elevated_button.dart';
import '../widgets/custom_text_field.dart';

class ForgetPasswordScreen extends StatefulWidget {
  const ForgetPasswordScreen({super.key});

  @override
  State<ForgetPasswordScreen> createState() => _ForgetPasswordScreenState();
}

class _ForgetPasswordScreenState extends State<ForgetPasswordScreen> {
  final _formKey1 = GlobalKey<FormState>();
  final _formKey2 = GlobalKey<FormState>();

  final _identifierCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _newPasswordCtrl = TextEditingController();
  final _confirmPasswordCtrl = TextEditingController();

  bool _isCodeSent = false;

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _otpCtrl.dispose();
    _newPasswordCtrl.dispose();
    _confirmPasswordCtrl.dispose();
    super.dispose();
  }

  String? _validateIdentifier(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email or phone number is required';
    final trimmed = value.trim();
    if (trimmed.contains('@')) {
      final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
      if (!emailRegex.hasMatch(trimmed)) return 'Enter a valid email address';
    } else {
      final phoneRegex = RegExp(r'^[0-9]{10}$');
      if (!phoneRegex.hasMatch(trimmed)) return 'Phone number must be exactly 10 digits';
    }
    return null;
  }

  String? _validateOtp(String? value) {
    if (value == null || value.trim().isEmpty) return 'Verification code is required';
    if (value.trim().length < 6) return 'Verification code must be 6 digits';
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'New password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) return 'Please confirm your password';
    if (value != _newPasswordCtrl.text) return 'Passwords do not match';
    return null;
  }

  Future<void> _submitRequest() async {
    if (!_formKey1.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final identifier = _identifierCtrl.text.trim();

    final success = await auth.forgetPassword(identifier);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'If the information is correct, a verification code (OTP) has been sent to your registered email or phone number. Please check your inbox.',
          ),
          duration: Duration(seconds: 6),
        ),
      );
      setState(() {
        _isCodeSent = true;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Failed to send verification code')),
      );
    }
  }

  Future<void> _resetPassword() async {
    if (!_formKey2.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final identifier = _identifierCtrl.text.trim();
    final otp = _otpCtrl.text.trim();
    final newPassword = _newPasswordCtrl.text;

    final success = await auth.resetPassword(identifier, otp, newPassword);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated successfully! Please login with your new password.')),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.errorMessage ?? 'Failed to reset password')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset Password'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Consumer<AuthProvider>(
              builder: (context, auth, _) {
                final isLoading = auth.state == AuthState.loading;

                return AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: !_isCodeSent
                      ? Form(
                          key: _formKey1,
                          child: Column(
                            key: const ValueKey('RequestForm'),
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Icon(Icons.lock_reset, size: 80, color: primaryColor),
                              const SizedBox(height: 24),
                              Text(
                                'Forgot Password',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Enter your registered email address or phone number and we will send you a verification code to reset your password.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey[600], height: 1.4),
                              ),
                              const SizedBox(height: 32),
                              CustomTextField(
                                controller: _identifierCtrl,
                                labelText: 'Email or Phone Number',
                                hintText: 'Enter your email or phone',
                                keyboardType: TextInputType.emailAddress,
                                prefixIcon: Icons.login_outlined,
                                validator: _validateIdentifier,
                              ),
                              const SizedBox(height: 32),
                              CustomElevatedButton(
                                label: 'Send Verification Code',
                                onPressed: _submitRequest,
                                isLoading: isLoading,
                              ),
                            ],
                          ),
                        )
                      : Form(
                          key: _formKey2,
                          child: Column(
                            key: const ValueKey('ResetForm'),
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Icon(Icons.shield_outlined, size: 80, color: primaryColor),
                              const SizedBox(height: 24),
                              Text(
                                'Enter Verification Code',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'We have sent an OTP verification code. Check your inbox for ${_identifierCtrl.text.trim()}.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey[600], height: 1.4),
                              ),
                              const SizedBox(height: 32),
                              CustomTextField(
                                controller: _otpCtrl,
                                labelText: 'Verification Code',
                                hintText: 'Enter 6-digit OTP',
                                keyboardType: TextInputType.number,
                                prefixIcon: Icons.pin_outlined,
                                validator: _validateOtp,
                              ),
                              const SizedBox(height: 16),
                              CustomTextField(
                                controller: _newPasswordCtrl,
                                labelText: 'New Password',
                                hintText: 'Enter new password',
                                isPassword: true,
                                prefixIcon: Icons.lock_outline,
                                validator: _validatePassword,
                              ),
                              const SizedBox(height: 16),
                              CustomTextField(
                                controller: _confirmPasswordCtrl,
                                labelText: 'Confirm New Password',
                                hintText: 'Re-enter new password',
                                isPassword: true,
                                prefixIcon: Icons.lock_outline,
                                validator: _validateConfirmPassword,
                              ),
                              const SizedBox(height: 32),
                              CustomElevatedButton(
                                label: 'Reset Password',
                                onPressed: _resetPassword,
                                isLoading: isLoading,
                              ),
                              const SizedBox(height: 16),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _isCodeSent = false;
                                  });
                                },
                                child: const Text('Back to email/phone entry'),
                              ),
                            ],
                          ),
                        ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

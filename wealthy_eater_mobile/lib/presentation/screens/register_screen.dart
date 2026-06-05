import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import 'verify_otp_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+');
    if (!emailRegex.hasMatch(value.trim())) return 'Enter a valid email address';
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  }

  Future<void> _doRegister() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    await auth.register(_emailCtrl.text.trim(), _passCtrl.text, _confirmCtrl.text);
    if (!mounted) return;
    if (auth.state == AuthState.error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage ?? 'Registration failed')));
      return;
    }

    // Navigate to verify OTP screen with email prefilled
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => VerifyOtpScreen(email: _emailCtrl.text.trim())));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Consumer<AuthProvider>(
            builder: (context, auth, _) {
              final isLoading = auth.state == AuthState.loading;
              return Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextFormField(controller: _emailCtrl, keyboardType: TextInputType.emailAddress, validator: _validateEmail, decoration: const InputDecoration(labelText: 'Email')),
                    const SizedBox(height: 12),
                    TextFormField(controller: _passCtrl, obscureText: true, validator: _validatePassword, decoration: const InputDecoration(labelText: 'Password')),
                    const SizedBox(height: 12),
                    TextFormField(controller: _confirmCtrl, obscureText: true, validator: (v) => v != _passCtrl.text ? 'Passwords do not match' : null, decoration: const InputDecoration(labelText: 'Confirm Password')),
                    const SizedBox(height: 20),
                    FilledButton(onPressed: isLoading ? null : _doRegister, child: isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Register')),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

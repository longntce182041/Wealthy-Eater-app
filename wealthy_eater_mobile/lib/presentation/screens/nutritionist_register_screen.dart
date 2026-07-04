import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import 'verify_otp_screen.dart';

class NutritionistRegisterScreen extends StatefulWidget {
  const NutritionistRegisterScreen({super.key});

  @override
  State<NutritionistRegisterScreen> createState() => _NutritionistRegisterScreenState();
}

class _NutritionistRegisterScreenState extends State<NutritionistRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _identifierCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
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

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  }

  Future<void> _doRegister() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final identifier = _identifierCtrl.text.trim();
    await auth.register(identifier, _passCtrl.text, _confirmCtrl.text, role: 'nutritionist');
    if (!mounted) return;
    if (auth.state == AuthState.error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage ?? 'Registration failed')));
      return;
    }

    // Navigate to verify OTP screen with identifier prefilled
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => VerifyOtpScreen(identifier: identifier),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nutritionist Register')),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Consumer<AuthProvider>(
              builder: (context, auth, _) {
                final isLoading = auth.state == AuthState.loading;
                return Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 20),
                      Icon(
                        Icons.health_and_safety,
                        size: 64,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Create Nutritionist Account',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Register with your email address or phone number',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 32),
                      TextFormField(
                        controller: _identifierCtrl,
                        keyboardType: TextInputType.emailAddress,
                        validator: _validateIdentifier,
                        decoration: const InputDecoration(
                          labelText: 'Email or Phone Number',
                          hintText: 'e.g. name@example.com or +1234567890',
                          prefixIcon: Icon(Icons.login_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passCtrl,
                        obscureText: _obscurePassword,
                        validator: _validatePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _confirmCtrl,
                        obscureText: _obscureConfirmPassword,
                        validator: (v) => v != _passCtrl.text ? 'Passwords do not match' : null,
                        decoration: InputDecoration(
                          labelText: 'Confirm Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscureConfirmPassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscureConfirmPassword = !_obscureConfirmPassword;
                              });
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                      FilledButton(
                        onPressed: isLoading ? null : _doRegister,
                        child: isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Register'),
                      ),
                    ],
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

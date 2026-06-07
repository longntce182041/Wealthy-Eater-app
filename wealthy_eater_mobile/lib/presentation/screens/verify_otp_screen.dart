import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

class VerifyOtpScreen extends StatefulWidget {
  final String email;

  const VerifyOtpScreen({super.key, required this.email});

  @override
  State<VerifyOtpScreen> createState() => _VerifyOtpScreenState();
}

class _VerifyOtpScreenState extends State<VerifyOtpScreen> {
  final _otpCtrl = TextEditingController();

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final auth = context.read<AuthProvider>();
    await auth.verifyOtp(widget.email, _otpCtrl.text.trim());
    if (!mounted) return;
    if (auth.state == AuthState.error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage ?? 'Verification failed')));
    } else if (auth.state == AuthState.authenticated) {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  Future<void> _resend() async {
    final auth = context.read<AuthProvider>();
    await auth.resendOtp(widget.email);
    if (!mounted) return;
    if (auth.state == AuthState.error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage ?? 'Resend failed')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification code resent')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Code')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Enter the 6-digit code sent to ${widget.email}', textAlign: TextAlign.center),
              const SizedBox(height: 12),
              TextField(controller: _otpCtrl, keyboardType: TextInputType.number, maxLength: 6, decoration: const InputDecoration(labelText: 'Verification code')),
              const SizedBox(height: 12),
              FilledButton(onPressed: _verify, child: const Text('Verify')),
              const SizedBox(height: 8),
              TextButton(onPressed: _resend, child: const Text('Resend code')),
            ],
          ),
        ),
      ),
    );
  }
}

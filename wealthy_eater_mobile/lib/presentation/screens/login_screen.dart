import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _doLogin() async {
    setState(() => _loading = true);
    try {
      await Provider.of<AuthProvider>(context, listen: false)
          .login(_emailCtrl.text.trim(), _passCtrl.text);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Login success')));
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      // navigate to home
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => HomeScreen(user: user)));
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _doGoogle() async {
    setState(() => _loading = true);
    try {
      await Provider.of<AuthProvider>(context, listen: false).googleSignIn();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Google login success')));
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => HomeScreen(user: user)));
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextField(controller: _passCtrl, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _loading ? null : _doLogin, child: _loading ? const CircularProgressIndicator() : const Text('Login')),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _loading ? null : _doGoogle,
              icon: const Icon(Icons.login),
              label: const Text('Sign in with Google'),
            )
          ],
        ),
      ),
    );
  }
}

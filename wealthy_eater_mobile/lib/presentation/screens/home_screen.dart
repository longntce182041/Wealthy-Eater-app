import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  final Map<String, dynamic>? user;
  const HomeScreen({super.key, this.user});

  @override
  Widget build(BuildContext context) {
    final name = user?['fullName'] ?? user?['email'] ?? 'User';
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: Center(child: Text('Welcome, $name')),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/network/api_client.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'presentation/providers/auth_provider.dart';
import 'presentation/screens/login_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseUrl = kIsWeb ? 'http://localhost:5000' : 'http://10.0.2.2:5000';
    final api = ApiClient(baseUrl);
    return MultiProvider(
      providers: [ChangeNotifierProvider(create: (_) => AuthProvider(api: api))],
      child: MaterialApp(
        title: 'Wealthy Eater Mobile',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: const LoginScreen(),
      ),
    );
  }
}
 

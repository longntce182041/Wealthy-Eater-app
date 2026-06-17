import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

enum Environment { dev, staging, prod }

class EnvConfig {
  static Environment environment = Environment.dev;

  static String get _localDevBaseUrl {
    if (kIsWeb) return 'http://localhost:5000';

    // Android emulators cannot access host localhost directly.
    if (Platform.isAndroid) return 'http://10.0.2.2:5000';

    // Windows/macOS/Linux/iOS simulator can access host localhost.
    return 'http://localhost:5000';
  }

  static String get baseUrl {
    switch (environment) {
      case Environment.prod:
        return 'https://api.wealthyeater.com';
      case Environment.staging:
        return 'https://staging-api.wealthyeater.com';
      case Environment.dev:
        return _localDevBaseUrl;
    }
  }

  static const int connectTimeout =
      15000; // 15 seconds network connection deadline
  static const int receiveTimeout = 15000;
}


import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

enum Environment { dev, staging, prod }

class EnvConfig {
  static Environment environment = Environment.dev;

  static const String deployedBaseUrl = 'https://wealthy-eater-app.onrender.com';

  static String get localBaseUrl {
    if (kIsWeb) return 'http://localhost:5000';
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5000';
      }
    } catch (_) {}
    return 'http://localhost:5000';
  }

  static String get baseUrl {
    switch (environment) {
      case Environment.prod:
        return deployedBaseUrl;
      case Environment.staging:
        return deployedBaseUrl;
      case Environment.dev:
        return deployedBaseUrl;
    }
  }

  static const int connectTimeout = 30000; // 30 seconds network connection deadline
  static const int receiveTimeout = 60000; // 60 seconds receive deadline for AI operations
}


import 'package:flutter/foundation.dart' show kIsWeb;

enum Environment { dev, staging, prod }

class EnvConfig {
  static Environment environment = Environment.dev;

  static String get baseUrl {
    switch (environment) {
      case Environment.prod:
        return 'https://wealthy-eater-app.onrender.com'; // 🚀 Production
      case Environment.staging:
        return 'https://wealthy-eater-app.onrender.com'; // 🧪 Staging
      case Environment.dev:
        if (kIsWeb) {
          return 'http://localhost:5000'; // 🌐 Chrome / Web browser
        }
        return 'http://10.0.2.2:5000'; // 🛠️ Android Emulator
        // Thiết bị thật: đổi thành http://<IP-máy-tính>:5000
    }
  }

  static const int connectTimeout = 30000;
  static const int receiveTimeout = 60000;
}

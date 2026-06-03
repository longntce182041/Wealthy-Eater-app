enum Environment { dev, staging, prod }

class EnvConfig {
  static Environment environment = Environment.dev;

  static String get baseUrl {
    switch (environment) {
      case Environment.prod:
        return 'https://api.wealthyeater.com';
      case Environment.staging:
        return 'https://staging-api.wealthyeater.com';
      case Environment.dev:
      default:
        // Points to standard local development fallback loops
        return 'http://10.0.2.2:5000/api/v1'; // Special loop redirection endpoint for Android emulators
    }
  }

  static const int connectTimeout =
      15000; // 15 seconds network connection deadline
  static const int receiveTimeout = 15000;
}

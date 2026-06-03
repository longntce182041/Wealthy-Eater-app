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
        return 'http://10.0.2.2:5000';
    }
  }

  static const int connectTimeout =
      15000; // 15 seconds network connection deadline
  static const int receiveTimeout = 15000;
}

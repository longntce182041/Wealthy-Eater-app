
enum Environment { dev, staging, prod }

class EnvConfig {
  static Environment environment = Environment.dev;
  static String get baseUrl {
    switch (environment) {
      case Environment.prod:
        return 'https://wealthy-eater-app.onrender.com';
      case Environment.staging:
        return 'https://wealthy-eater-app.onrender.com';
      case Environment.dev:
        return 'https://wealthy-eater-app.onrender.com';
    }
  }

  static const int connectTimeout =
      30000; // 30 seconds network connection deadline
  static const int receiveTimeout = 60000; // 60 seconds receive deadline for AI operations
}

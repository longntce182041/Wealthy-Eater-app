import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/env_config.dart';

/// HTTP client wrapping Dio.
///
/// - Reads timeout values from [EnvConfig] (single source of truth).
/// - Automatically attaches `Authorization: Bearer <token>` on every request
///   via [_AuthInterceptor] if a token exists in secure storage.
/// - Throws [DioException] on network / server errors — callers should
///   convert with [mapError] from `core/error/app_error.dart`.
class ApiClient {
  final Dio dio;

  ApiClient(String baseUrl, {FlutterSecureStorage? storage})
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: Duration(milliseconds: EnvConfig.connectTimeout),
            receiveTimeout: Duration(milliseconds: EnvConfig.receiveTimeout),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(_AuthInterceptor(storage ?? const FlutterSecureStorage()));
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Map<String, dynamic>? headers,
  }) {
    return dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: headers != null ? Options(headers: headers) : null,
    );
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? headers,
  }) {
    return dio.post<T>(
      path,
      data: data,
      options: headers != null ? Options(headers: headers) : null,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? headers,
  }) {
    return dio.put<T>(
      path,
      data: data,
      options: headers != null ? Options(headers: headers) : null,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    Map<String, dynamic>? headers,
  }) {
    return dio.delete<T>(
      path,
      options: headers != null ? Options(headers: headers) : null,
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? headers,
  }) {
    return dio.patch<T>(
      path,
      data: data,
      options: headers != null ? Options(headers: headers) : null,
    );
  }
}

/// Dio interceptor that reads the stored access token and injects it
/// as a Bearer Authorization header on every outgoing request.
class _AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;

  _AuthInterceptor(this._storage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for public endpoints
    const publicPaths = ['/api/auth/login', '/api/auth/google', '/api/auth/refresh'];
    if (publicPaths.any((p) => options.path.startsWith(p))) {
      return handler.next(options);
    }

    final token = await _storage.read(key: 'accessToken');
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

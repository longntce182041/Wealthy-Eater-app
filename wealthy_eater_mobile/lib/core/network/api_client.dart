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
    dio.interceptors.add(_AuthInterceptor(storage ?? const FlutterSecureStorage(), dio));
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
  final Dio _dio;
  bool _isRefreshing = false;

  _AuthInterceptor(this._storage, this._dio);

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

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      final refreshToken = await _storage.read(key: 'refreshToken');
      if (refreshToken != null && refreshToken.isNotEmpty) {
        _isRefreshing = true;
        try {
          // Attempt to refresh the token directly via Dio
          final refreshRes = await _dio.post('/api/auth/refresh', data: {
            'refreshToken': refreshToken,
          });

          if (refreshRes.statusCode == 200 && refreshRes.data['success'] == true) {
            final newAccessToken = refreshRes.data['data']['accessToken'];
            await _storage.write(key: 'accessToken', value: newAccessToken);

            // Retry the original request with the new token
            final options = err.requestOptions;
            options.headers['Authorization'] = 'Bearer $newAccessToken';
            
            final retryRes = await _dio.fetch(options);
            _isRefreshing = false;
            return handler.resolve(retryRes);
          }
        } catch (_) {
          // Refresh failed, fall through to error
        }
        _isRefreshing = false;
      }
    }
    return handler.next(err);
  }
}

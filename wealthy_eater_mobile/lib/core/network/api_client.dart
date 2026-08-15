import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/env_config.dart';
import 'session_expired_notifier.dart';

/// HTTP client wrapping Dio.
///
/// - Reads timeout values from [EnvConfig] (single source of truth).
/// - Automatically attaches `Authorization: Bearer <token>` on every request
///   via [_AuthInterceptor] if a token exists in secure storage.
/// - Throws [DioException] on network / server errors — callers should
///   convert with [mapError] from `core/error/app_error.dart`.
class ApiClient {
  final Dio dio;

  ApiClient([String? baseUrl, FlutterSecureStorage? storage])
      : dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? EnvConfig.baseUrl,
            connectTimeout: Duration(milliseconds: EnvConfig.connectTimeout),
            receiveTimeout: Duration(milliseconds: EnvConfig.receiveTimeout),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(_AuthInterceptor(storage ?? const FlutterSecureStorage(), dio));
    dio.interceptors.add(_FallbackInterceptor(EnvConfig.localBaseUrl));
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
  final List<Map<String, dynamic>> _failedRequests = [];

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
    const publicPaths = ['/api/auth/login', '/api/auth/google', '/api/auth/refresh'];
    final isPublicPath = publicPaths.any((p) => err.requestOptions.path.startsWith(p));

    if (err.response?.statusCode == 401 && !isPublicPath) {
      // If we're already refreshing, just queue this request and return immediately.
      if (_isRefreshing) {
        _failedRequests.add({
          'options': err.requestOptions,
          'handler': handler,
        });
        return;
      }

      final refreshToken = await _storage.read(key: 'refreshToken');
      if (refreshToken != null && refreshToken.isNotEmpty) {
        _isRefreshing = true;
        try {
          // Use a separate Dio instance to avoid interceptor recursion
          final refreshDio = Dio(BaseOptions(baseUrl: _dio.options.baseUrl));
          final refreshRes = await refreshDio.post('/api/auth/refresh', data: {
            'refreshToken': refreshToken,
          });

          if (refreshRes.statusCode == 200 && refreshRes.data['success'] == true) {
            final newAccessToken = refreshRes.data['data']['accessToken'];
            await _storage.write(key: 'accessToken', value: newAccessToken);

            // Retry all queued requests with the new token
            for (var req in _failedRequests) {
              final options = req['options'] as RequestOptions;
              final reqHandler = req['handler'] as ErrorInterceptorHandler;
              
              options.headers['Authorization'] = 'Bearer $newAccessToken';
              try {
                final response = await _dio.fetch(options);
                reqHandler.resolve(response);
              } on DioException catch (e) {
                reqHandler.next(e);
              }
            }
            _failedRequests.clear();

            // Retry the original request that triggered the refresh
            final options = err.requestOptions;
            options.headers['Authorization'] = 'Bearer $newAccessToken';
            
            final retryRes = await _dio.fetch(options);
            _isRefreshing = false;
            return handler.resolve(retryRes);
          } else {
             await _clearTokens();
             SessionExpiredNotifier.instance.notifyExpired();
             _rejectQueue(err);
             return handler.next(err);
          }
        } catch (_) {
          await _clearTokens();
          SessionExpiredNotifier.instance.notifyExpired();
          _rejectQueue(err);
          return handler.next(err);
        } finally {
          _isRefreshing = false;
        }
      } else {
        // No refresh token at all — hard logout
        await _clearTokens();
        SessionExpiredNotifier.instance.notifyExpired();
        _rejectQueue(err);
        return handler.next(err);
      }
    } else {
      return handler.next(err);
    }
  }

  void _rejectQueue(DioException err) {
    for (var req in _failedRequests) {
      (req['handler'] as ErrorInterceptorHandler).next(err);
    }
    _failedRequests.clear();
  }

  Future<void> _clearTokens() async {
    await _storage.delete(key: 'accessToken');
    await _storage.delete(key: 'refreshToken');
    await _storage.delete(key: 'user');
  }
}

/// Interceptor that attempts to fallback to the local backend if the deployed backend fails
/// due to connection error, timeout, or server unavailable (5xx).
class _FallbackInterceptor extends Interceptor {
  final String _localBaseUrl;

  _FallbackInterceptor(this._localBaseUrl);

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final isDeployedUrl = options.baseUrl.contains('onrender.com');

    final isNetworkOrServerError = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.unknown ||
        (err.response != null && err.response!.statusCode! >= 500);

    if (isDeployedUrl && isNetworkOrServerError && _localBaseUrl.isNotEmpty) {
      try {
        final fallbackOptions = options.copyWith(
          baseUrl: _localBaseUrl,
        );

        final localDio = Dio(BaseOptions(
          baseUrl: _localBaseUrl,
          connectTimeout: const Duration(seconds: 5),
          receiveTimeout: Duration(milliseconds: EnvConfig.receiveTimeout),
          headers: options.headers,
        ));

        final response = await localDio.fetch(fallbackOptions);
        return handler.resolve(response);
      } catch (_) {
        // Fallback failed as well, proceed with original error
      }
    }
    handler.next(err);
  }
}


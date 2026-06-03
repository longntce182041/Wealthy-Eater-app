import 'package:dio/dio.dart';

/// Unified application error with a user-friendly [message].
class AppError implements Exception {
  final String message;
  final int? statusCode;

  const AppError(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Maps a [DioException] or generic [Exception] to an [AppError]
/// with a meaningful message for the UI.
AppError mapError(Object error) {
  if (error is AppError) return error;

  if (error is DioException) {
    final data = error.response?.data;
    final serverMsg = data is Map ? data['message']?.toString() : null;

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const AppError('Connection timed out. Please check your network.');
      case DioExceptionType.connectionError:
        return const AppError('Unable to reach server. Please check your internet connection.');
      case DioExceptionType.badResponse:
        final code = error.response?.statusCode;
        if (code == 401) return AppError(serverMsg ?? 'Session expired. Please log in again.', statusCode: 401);
        if (code == 403) return AppError(serverMsg ?? 'You do not have permission to do that.', statusCode: 403);
        if (code == 404) return AppError(serverMsg ?? 'Resource not found.', statusCode: 404);
        if (code != null && code >= 500) return AppError(serverMsg ?? 'Server error. Please try again later.', statusCode: code);
        return AppError(serverMsg ?? 'Unexpected error (${code ?? "?"}).');
      default:
        return AppError(serverMsg ?? error.message ?? 'Network error.');
    }
  }

  if (error is Exception) {
    final msg = error.toString().replaceFirst('Exception: ', '');
    return AppError(msg);
  }

  return AppError(error.toString());
}

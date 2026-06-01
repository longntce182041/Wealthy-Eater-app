import 'package:dio/dio.dart';

class ApiClient {
  final Dio dio;

  ApiClient(String baseUrl)
      : dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(milliseconds: 5000),
          receiveTimeout: const Duration(milliseconds: 5000),
        ));

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? headers}) async {
    return dio.post(path, data: data, options: Options(headers: headers));
  }
}

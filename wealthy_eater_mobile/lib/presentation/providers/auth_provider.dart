import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../core/config/secrets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient api;
  final storage = const FlutterSecureStorage();

  AuthProvider({required this.api});

  Map<String, dynamic>? user;
  String? accessToken;

  Future<void> login(String email, String password) async {
    try {
      final res = await api.post('/api/auth/login', data: {'email': email, 'password': password});
      if (res.statusCode == 200 && res.data['success'] == true) {
        accessToken = res.data['data']['accessToken'];
        user = Map<String, dynamic>.from(res.data['data']['user']);
        await storage.write(key: 'accessToken', value: accessToken);
        notifyListeners();
      } else {
        throw Exception(res.data['message'] ?? 'Login failed');
      }
    } catch (e) {
      // surface Dio error messages when possible
      String msg = 'Login failed';
      try {
        if (e is DioException && e.response != null) {
          msg = e.response?.data?['message'] ?? e.message ?? msg;
        } else if (e is Exception) {
          msg = e.toString();
        }
      } catch (_) {}
      throw Exception(msg);
    }
  }

  Future<void> googleSignIn() async {
    final GoogleSignIn googleSignIn = kIsWeb
      ? GoogleSignIn(clientId: googleClientId)
      : GoogleSignIn();
    final account = await googleSignIn.signIn();
    if (account == null) throw Exception('Google sign in aborted');

    final idToken = (await account.authentication).idToken;
    if (idToken == null) throw Exception('No idToken from Google');

    try {
      final res = await api.post('/api/auth/google', data: {'idToken': idToken});
      if (res.statusCode == 200 && res.data['success'] == true) {
        accessToken = res.data['data']['accessToken'];
        user = Map<String, dynamic>.from(res.data['data']['user']);
        await storage.write(key: 'accessToken', value: accessToken);
        notifyListeners();
      } else {
        throw Exception(res.data['message'] ?? 'Google login failed');
      }
    } catch (e) {
      String msg = 'Google login failed';
      try {
        if (e is DioException && e.response != null) {
          msg = e.response?.data?['message'] ?? e.message ?? msg;
        } else if (e is Exception) {
          msg = e.toString();
        }
      } catch (_) {}
      throw Exception(msg);
    }
  }
}

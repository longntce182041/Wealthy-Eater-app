/// chatbot_service.dart — HTTP service for the AI Nutrition Chatbot API.
///
/// Communicates with:
///  POST /api/user/chatbot/message  — send message, receive AI reply
///  GET  /api/user/chatbot/history  — fetch conversation history
///  DELETE /api/user/chatbot/session — reset (clear) current session
library;

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../models/chatbot_message_model.dart';

class ChatbotService {
  final ApiClient _apiClient;

  const ChatbotService({required ApiClient apiClient}) : _apiClient = apiClient;

  // ── Send Message ──────────────────────────────────────────────────────────

  /// Sends a message to NutriBot and returns the AI reply + sessionId.
  ///
  /// Returns `{ reply, sessionId }` on success.
  /// Throws [AppError] on failure.
  Future<({String reply, String sessionId})> sendMessage(
    String message, {
    String? sessionId,
  }) async {
    try {
      final response = await _apiClient.post(
        '/api/user/chatbot/message',
        data: {
          'message':    message,
          'session_id': sessionId,
        }..removeWhere((k, _) => k == 'session_id' && sessionId == null),
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return (
          reply:     data['reply'] as String? ?? '',
          sessionId: data['sessionId'] as String? ?? '',
        );
      }

      throw AppError(
        response.data['error']?['message'] ??
            'Unable to connect to the AI assistant.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── Get History ───────────────────────────────────────────────────────────

  /// Fetches conversation history from the active session.
  ///
  /// Returns `{ sessionId, messages }` on success.
  Future<({String? sessionId, List<ChatbotMessageModel> messages})>
      getHistory({int limit = 20}) async {
    try {
      final response = await _apiClient.get(
        '/api/user/chatbot/history',
        queryParameters: {'limit': limit.toString()},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data       = response.data['data'] as Map<String, dynamic>;
        final rawMsgs    = data['messages'] as List<dynamic>? ?? [];
        final sessionId  = data['sessionId'] as String?;
        final messages   = rawMsgs
            .map((m) =>
                ChatbotMessageModel.fromJson(m as Map<String, dynamic>))
            .toList();
        return (sessionId: sessionId, messages: messages);
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Unable to load chat history.',
      );
    } catch (e) {
      throw mapError(e);
    }
  }

  // ── Reset Session ─────────────────────────────────────────────────────────

  /// Soft-deletes the current session so the next message starts fresh.
  Future<bool> resetSession() async {
    try {
      final response = await _apiClient.delete('/api/user/chatbot/session');
      return response.statusCode == 200 &&
          response.data['success'] == true;
    } catch (e) {
      throw mapError(e);
    }
  }
}

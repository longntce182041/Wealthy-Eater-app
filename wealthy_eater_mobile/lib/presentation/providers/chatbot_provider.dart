/// chatbot_provider.dart — State management for the AI Nutrition Chatbot.
///
/// Manages:
///  - Message list with optimistic updates (user bubble appears instantly).
///  - Loading and sending states for UX feedback.
///  - Session ID tracking for multi-turn Gemini context.
///  - History load on screen open.
///  - Session reset.
library;

import 'package:flutter/foundation.dart';

import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../data/models/chatbot_message_model.dart';
import '../../data/services/chatbot_service.dart';

enum ChatbotLoadState { initial, loading, loaded, error }

class ChatbotProvider extends ChangeNotifier {
  final ChatbotService _service;

  ChatbotProvider({required ApiClient api})
      : _service = ChatbotService(apiClient: api);

  // ── State ──────────────────────────────────────────────────────────────────
  List<ChatbotMessageModel> _messages  = [];
  ChatbotLoadState _loadState          = ChatbotLoadState.initial;
  bool _isSending                      = false;
  bool _isResetting                    = false;
  String? _sessionId;
  String? _errorMessage;

  // ── Getters ────────────────────────────────────────────────────────────────
  List<ChatbotMessageModel> get messages  => _messages;
  ChatbotLoadState get loadState          => _loadState;
  bool get isSending                      => _isSending;
  bool get isResetting                    => _isResetting;
  String? get sessionId                   => _sessionId;
  String? get errorMessage                => _errorMessage;
  bool get hasMessages                    => _messages.isNotEmpty;

  // ── Initialisation ─────────────────────────────────────────────────────────

  /// Load conversation history when the chatbot screen opens.
  Future<void> loadHistory() async {
    if (_loadState == ChatbotLoadState.loading) return;

    _loadState    = ChatbotLoadState.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final result = await _service.getHistory(limit: 30);
      _sessionId = result.sessionId;
      // History comes newest-first; reverse for display (oldest at top)
      _messages = result.messages.reversed.toList();
      _loadState = ChatbotLoadState.loaded;
    } catch (e) {
      _loadState    = ChatbotLoadState.error;
      _errorMessage = mapError(e).message;
      debugPrint('[ChatbotProvider] loadHistory error: $e');
    }

    notifyListeners();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  void _addMessage(ChatbotMessageModel msg) {
    _messages = [..._messages, msg];
  }

  void _removeMessage(ChatbotMessageModel msg) {
    _messages = _messages.where((m) => m != msg).toList();
  }

  // ── Send Message ───────────────────────────────────────────────────────────

  /// Sends a message to NutriBot with optimistic UI update.
  ///
  /// Adds the user bubble immediately, then awaits the AI reply.
  /// If the API fails, the optimistic message is replaced with an error notice.
  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _isSending) return;

    // 1. Optimistic: show user bubble immediately
    final userMsg = ChatbotMessageModel.userMessage(trimmed);
    _addMessage(userMsg);
    _isSending    = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 2. Call API
      final result = await _service.sendMessage(
        trimmed,
        sessionId: _sessionId,
      );

      _sessionId = result.sessionId;

      // 3. Append AI reply
      final aiMsg = ChatbotMessageModel(
        role:      'model',
        content:   result.reply,
        createdAt: DateTime.now(),
      );
      _addMessage(aiMsg);
    } catch (e) {
      final errMsg = mapError(e).message;
      _errorMessage = errMsg;

      // Revert optimistic user message so history stays clean
      _removeMessage(userMsg);

      debugPrint('[ChatbotProvider] sendMessage error: $e');
    } finally {
      _isSending = false;
      notifyListeners();
    }
  }

  // ── Reset Session ──────────────────────────────────────────────────────────

  /// Clears the current conversation and starts a fresh session.
  Future<void> resetSession() async {
    _isResetting  = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _service.resetSession();
    } catch (e) {
      debugPrint('[ChatbotProvider] resetSession error: $e');
    } finally {
      // Always clear locally, even if server call fails
      _messages    = [];
      _sessionId   = null;
      _loadState   = ChatbotLoadState.loaded;
      _isResetting = false;
      notifyListeners();
    }
  }

  // ── Clear Error ────────────────────────────────────────────────────────────

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/error/app_error.dart';

class ChatMessage {
  final String text;
  final bool isUser;

  ChatMessage({required this.text, required this.isUser});
}

class ChatbotProvider extends ChangeNotifier {
  final ApiClient api;

  ChatbotProvider({required this.api});

  final List<ChatMessage> _messages = [
    ChatMessage(
      text: "Hello! I am the Wealthy Eater AI Assistant. How can I help you with your daily meals today?\n\nXin chào! Tôi là Trợ lý AI của Wealthy Eater. Hôm nay tôi có thể giúp gì cho thực đơn của bạn?",
      isUser: false,
    )
  ];
  bool _isTyping = false;
  String? _errorMessage;

  List<ChatMessage> get messages => _messages;
  bool get isTyping => _isTyping;
  String? get errorMessage => _errorMessage;

  void clear() {
    _messages.clear();
    _addInitialGreeting();
    _errorMessage = null;
    notifyListeners();
  }

  void _addInitialGreeting() {
    if (_messages.isEmpty) {
      _messages.add(
        ChatMessage(
          text: "Hello! I am the Wealthy Eater AI Assistant. How can I help you with your daily meals today?\n\nXin chào! Tôi là Trợ lý AI của Wealthy Eater. Hôm nay tôi có thể giúp gì cho thực đơn của bạn?",
          isUser: false,
        ),
      );
    }
  }

  Future<void> fetchHistory() async {
    try {
      final response = await api.get('/api/user/chatbot/history');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final history = response.data['data']['history'] as List;
        _messages.clear();
        for (var msg in history) {
          _messages.add(ChatMessage(
            text: msg['text'],
            isUser: msg['isUser'],
          ));
        }
        _addInitialGreeting(); // Add greeting if history is empty
        notifyListeners();
      }
    } catch (e) {
      // Silently fail history fetch and just start fresh
      _messages.clear();
      _addInitialGreeting();
      notifyListeners();
    }
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    _messages.add(ChatMessage(text: text, isUser: true));
    _isTyping = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await api.post('/api/user/chatbot/ask', data: {
        'message': text,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final reply = response.data['data']['reply'];
        _messages.add(ChatMessage(text: reply, isUser: false));
      } else {
        _errorMessage = 'Failed to get a response from the assistant.';
      }
    } catch (e) {
      final error = mapError(e);
      _errorMessage = error.message;
    } finally {
      _isTyping = false;
      notifyListeners();
    }
  }
}

import 'package:flutter/material.dart';

import '../../domain/entities/chatbot.dart';
import '../../domain/usecases/chatbot_usecases.dart';

class ChatbotProvider extends ChangeNotifier {
  final GetChatbotHistoryUseCase getChatbotHistoryUseCase;
  final SendChatbotMessageUseCase sendChatbotMessageUseCase;

  ChatbotProvider({
    required this.getChatbotHistoryUseCase,
    required this.sendChatbotMessageUseCase,
  });

  final List<ChatbotMessageEntity> _messages = [
    const ChatbotMessageEntity(
      text: "Hello! I am the Wealthy Eater AI Assistant. How can I help you with your daily meals today?\n\nXin chào! Tôi là Trợ lý AI của Wealthy Eater. Hôm nay tôi có thể giúp gì cho thực đơn của bạn?",
      isUser: false,
    )
  ];
  bool _isTyping = false;
  String? _errorMessage;

  List<ChatbotMessageEntity> get messages => _messages;
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
        const ChatbotMessageEntity(
          text: "Hello! I am the Wealthy Eater AI Assistant. How can I help you with your daily meals today?\n\nXin chào! Tôi là Trợ lý AI của Wealthy Eater. Hôm nay tôi có thể giúp gì cho thực đơn của bạn?",
          isUser: false,
        ),
      );
    }
  }

  Future<void> fetchHistory() async {
    try {
      final history = await getChatbotHistoryUseCase();
      _messages.clear();
      _messages.addAll(history);
      _addInitialGreeting(); // Add greeting if history is empty
      notifyListeners();
    } catch (e) {
      // Silently fail history fetch and just start fresh
      _messages.clear();
      _addInitialGreeting();
      notifyListeners();
    }
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    _messages.add(ChatbotMessageEntity(text: text, isUser: true));
    _isTyping = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final reply = await sendChatbotMessageUseCase(text);
      _messages.add(reply);
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isTyping = false;
      notifyListeners();
    }
  }
}

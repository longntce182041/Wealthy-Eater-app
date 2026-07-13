/// chatbot_message_model.dart — Data model for a single NutriBot chat message.
///
/// Mirrors the embedded sub-document stored in ChatbotSession.messages.
library;

class ChatbotMessageModel {
  final String role;    // 'user' | 'model'
  final String content;
  final DateTime? createdAt;

  const ChatbotMessageModel({
    required this.role,
    required this.content,
    this.createdAt,
  });

  bool get isUser  => role == 'user';
  bool get isModel => role == 'model';

  factory ChatbotMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatbotMessageModel(
      role:      json['role'] as String? ?? 'model',
      content:   json['content'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())?.toLocal()
          : null,
    );
  }

  /// Creates a temporary optimistic message before the server confirms.
  factory ChatbotMessageModel.userMessage(String content) {
    return ChatbotMessageModel(
      role:      'user',
      content:   content,
      createdAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'role':       role,
        'content':    content,
        'created_at': createdAt?.toIso8601String(),
      };
}

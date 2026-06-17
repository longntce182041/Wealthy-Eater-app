import '../../core/error/app_error.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/chatbot.dart';
import '../../domain/repositories/chatbot_repository.dart';

class ChatbotRepositoryImpl implements ChatbotRepository {
  final ApiClient apiClient;

  ChatbotRepositoryImpl({required this.apiClient});

  @override
  Future<List<ChatbotMessageEntity>> fetchHistory() async {
    try {
      final response = await apiClient.get('/api/user/chatbot/history');
      if (response.statusCode == 200 && response.data['success'] == true) {
        final history = response.data['data']['history'] as List;
        return history.map((msg) {
          return ChatbotMessageEntity(
            text: msg['text']?.toString() ?? '',
            isUser: msg['isUser'] as bool? ?? false,
          );
        }).toList();
      }
      throw AppError('Failed to fetch history');
    } catch (e) {
      throw mapError(e);
    }
  }

  @override
  Future<ChatbotMessageEntity> sendMessage(String text) async {
    try {
      final response = await apiClient.post('/api/user/chatbot/ask', data: {
        'message': text,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        final reply = response.data['data']['reply']?.toString() ?? '';
        return ChatbotMessageEntity(text: reply, isUser: false);
      }
      throw AppError('Failed to get a response from the assistant.');
    } catch (e) {
      throw mapError(e);
    }
  }
}

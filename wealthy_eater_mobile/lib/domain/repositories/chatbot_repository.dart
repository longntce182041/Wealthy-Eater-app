import '../entities/chatbot.dart';

abstract class ChatbotRepository {
  Future<List<ChatbotMessageEntity>> fetchHistory();
  Future<ChatbotMessageEntity> sendMessage(String text);
}

import '../entities/chatbot.dart';
import '../repositories/chatbot_repository.dart';

class GetChatbotHistoryUseCase {
  final ChatbotRepository repository;
  GetChatbotHistoryUseCase(this.repository);
  Future<List<ChatbotMessageEntity>> call() => repository.fetchHistory();
}

class SendChatbotMessageUseCase {
  final ChatbotRepository repository;
  SendChatbotMessageUseCase(this.repository);
  Future<ChatbotMessageEntity> call(String text) => repository.sendMessage(text);
}

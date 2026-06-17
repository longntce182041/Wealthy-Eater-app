import 'dart:io';
import '../entities/chat.dart';
import '../repositories/chat_repository.dart';

class FetchActiveContractsUseCase {
  final ChatRepository repository;
  FetchActiveContractsUseCase(this.repository);
  Future<List<Map<String, dynamic>>> call() => repository.fetchActiveContracts();
}

class FetchMessageHistoryUseCase {
  final ChatRepository repository;
  FetchMessageHistoryUseCase(this.repository);
  Future<ChatHistoryEntity> call(
    String contractId, {
    int page = 1,
    int limit = 30,
    String? before,
  }) =>
      repository.fetchMessageHistory(
        contractId,
        page: page,
        limit: limit,
        before: before,
      );
}

class UploadChatImageUseCase {
  final ChatRepository repository;
  UploadChatImageUseCase(this.repository);
  Future<ChatMessageEntity> call(String contractId, File imageFile) =>
      repository.uploadImage(contractId, imageFile);
}

class MarkChatMessagesReadUseCase {
  final ChatRepository repository;
  MarkChatMessagesReadUseCase(this.repository);
  Future<void> call(String contractId) => repository.markMessagesRead(contractId);
}

class ConnectChatSocketUseCase {
  final ChatRepository repository;
  ConnectChatSocketUseCase(this.repository);
  void call(String token) => repository.connect(token);
}

class DisconnectChatSocketUseCase {
  final ChatRepository repository;
  DisconnectChatSocketUseCase(this.repository);
  void call() => repository.disconnect();
}

class GetChatSocketConnectedUseCase {
  final ChatRepository repository;
  GetChatSocketConnectedUseCase(this.repository);
  bool call() => repository.isConnected;
}

class JoinChatRoomUseCase {
  final ChatRepository repository;
  JoinChatRoomUseCase(this.repository);
  void call(String contractId) => repository.joinRoom(contractId);
}

class SendChatTextMessageUseCase {
  final ChatRepository repository;
  SendChatTextMessageUseCase(this.repository);
  Future<void> call(String contractId, String content) =>
      repository.sendTextMessage(contractId, content);
}

class EmitChatMarkReadUseCase {
  final ChatRepository repository;
  EmitChatMarkReadUseCase(this.repository);
  void call(String contractId) => repository.emitMarkRead(contractId);
}

class ListenChatNewMessageUseCase {
  final ChatRepository repository;
  ListenChatNewMessageUseCase(this.repository);
  void call(void Function(ChatMessageEntity msg) callback) =>
      repository.onNewMessage(callback);
}

class ListenChatMessagesReadUseCase {
  final ChatRepository repository;
  ListenChatMessagesReadUseCase(this.repository);
  void call(void Function(String contractId, String readerId) callback) =>
      repository.onMessagesRead(callback);
}

class ListenChatSocketErrorUseCase {
  final ChatRepository repository;
  ListenChatSocketErrorUseCase(this.repository);
  void call(void Function(String code, String message) callback) =>
      repository.onSocketError(callback);
}

class ListenChatRoomJoinedUseCase {
  final ChatRepository repository;
  ListenChatRoomJoinedUseCase(this.repository);
  void call(void Function(String contractId) callback) =>
      repository.onRoomJoined(callback);
}

class RemoveChatAllListenersUseCase {
  final ChatRepository repository;
  RemoveChatAllListenersUseCase(this.repository);
  void call() => repository.removeAllListeners();
}

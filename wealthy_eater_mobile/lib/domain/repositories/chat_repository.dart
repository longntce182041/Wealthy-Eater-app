import 'dart:io';
import '../entities/chat.dart';

abstract class ChatRepository {
  Future<List<Map<String, dynamic>>> fetchActiveContracts();
  
  Future<ChatHistoryEntity> fetchMessageHistory(
    String contractId, {
    int page = 1,
    int limit = 30,
    String? before,
  });

  Future<ChatMessageEntity> uploadImage(String contractId, File imageFile);

  Future<void> markMessagesRead(String contractId);

  void connect(String token);

  void disconnect();

  bool get isConnected;

  void joinRoom(String contractId);

  Future<void> sendTextMessage(String contractId, String content);

  void emitMarkRead(String contractId);

  void onNewMessage(void Function(ChatMessageEntity msg) callback);

  void onMessagesRead(void Function(String contractId, String readerId) callback);

  void onSocketError(void Function(String code, String message) callback);

  void onRoomJoined(void Function(String contractId) callback);

  void removeAllListeners();
}

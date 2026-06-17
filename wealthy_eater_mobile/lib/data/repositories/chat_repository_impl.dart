import 'dart:io';

import '../../domain/entities/chat.dart';
import '../../domain/repositories/chat_repository.dart';
import '../models/chat_message_model.dart';
import '../services/chat_service.dart';

class ChatRepositoryImpl implements ChatRepository {
  final ChatService service;

  ChatRepositoryImpl({required this.service});

  @override
  Future<List<Map<String, dynamic>>> fetchActiveContracts() {
    return service.fetchActiveContracts();
  }

  @override
  Future<ChatHistoryEntity> fetchMessageHistory(
    String contractId, {
    int page = 1,
    int limit = 30,
    String? before,
  }) async {
    final result = await service.fetchMessageHistory(
      contractId,
      page: page,
      limit: limit,
      before: before,
    );

    return ChatHistoryEntity(
      messages: result.messages,
      total: result.total,
      hasMore: result.hasMore,
      page: result.page,
    );
  }

  @override
  Future<ChatMessageEntity> uploadImage(String contractId, File imageFile) {
    return service.uploadImage(contractId, imageFile);
  }

  @override
  Future<void> markMessagesRead(String contractId) {
    return service.markMessagesRead(contractId);
  }

  @override
  void connect(String token) {
    service.connect(token);
  }

  @override
  void disconnect() {
    service.disconnect();
  }

  @override
  bool get isConnected => service.isConnected;

  @override
  void joinRoom(String contractId) {
    service.joinRoom(contractId);
  }

  @override
  Future<void> sendTextMessage(String contractId, String content) {
    return service.sendTextMessage(contractId, content);
  }

  @override
  void emitMarkRead(String contractId) {
    service.emitMarkRead(contractId);
  }

  @override
  void onNewMessage(void Function(ChatMessageEntity msg) callback) {
    service.onNewMessage((model) => callback(model));
  }

  @override
  void onMessagesRead(void Function(String contractId, String readerId) callback) {
    service.onMessagesRead(callback);
  }

  @override
  void onSocketError(void Function(String code, String message) callback) {
    service.onSocketError(callback);
  }

  @override
  void onRoomJoined(void Function(String contractId) callback) {
    service.onRoomJoined(callback);
  }

  @override
  void removeAllListeners() {
    service.removeAllListeners();
  }
}

/// chat_service.dart — Data service for the Consultation Chat feature.
///
/// Handles:
///  - HTTP calls via [ApiClient]: fetch history, upload image, mark read.
///  - Socket.IO connection lifecycle via `socket_io_client`.
///
/// The [ChatProvider] owns and controls this service's lifecycle.
library;

import 'dart:io';

import 'package:dio/dio.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;

import 'dart:async';

import '../../core/network/api_client.dart';
import '../../core/error/app_error.dart';
import '../models/chat_message_model.dart';

/// Result of a paginated message history fetch.
class MessageHistoryResult {
  final List<ChatMessageModel> messages;
  final int total;
  final bool hasMore;
  final int page;

  const MessageHistoryResult({
    required this.messages,
    required this.total,
    required this.hasMore,
    required this.page,
  });
}

class ChatService {
  final ApiClient _apiClient;
  socket_io.Socket? _socket;

  ChatService({required ApiClient apiClient}) : _apiClient = apiClient;

  // ── HTTP: Fetch Message History ────────────────────────────────────────────

  /// GET /api/chat/:contractId/messages
  /// Fetches a page of messages, newest first.
  /// Pass [before] (a message id) for cursor-based pagination (load older messages).
  Future<MessageHistoryResult> fetchMessageHistory(
    String contractId, {
    int page = 1,
    int limit = 30,
    String? before,
  }) async {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
        'before': before,
      };

      final response = await _apiClient.get(
        '/api/chat/$contractId/messages',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        final rawMessages = data['messages'] as List<dynamic>? ?? [];
        return MessageHistoryResult(
          messages: rawMessages
              .map((m) => ChatMessageModel.fromJson(m as Map<String, dynamic>))
              .toList(),
          total: (data['total'] as num?)?.toInt() ?? 0,
          hasMore: data['hasMore'] as bool? ?? false,
          page: (data['page'] as num?)?.toInt() ?? page,
        );
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to fetch messages.',
      );
  }

  // ── HTTP: Upload Image ─────────────────────────────────────────────────────

  /// POST /api/chat/:contractId/messages/image
  /// Uploads a meal image file and returns the persisted image message.
  Future<ChatMessageModel> uploadImage(
    String contractId,
    File imageFile,
  ) async {
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(
          imageFile.path,
          filename: imageFile.path.split('/').last,
        ),
      });

      // Use dio directly so we can set multipart content-type
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/api/chat/$contractId/messages/image',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      if (response.statusCode == 201 && response.data?['success'] == true) {
        return ChatMessageModel.fromJson(
          response.data!['data'] as Map<String, dynamic>,
        );
      }

      throw AppError(
        response.data?['error']?['message'] ?? 'Failed to upload image.',
      );
  }


  // ── HTTP: Mark Messages Read ───────────────────────────────────────────────

  /// PATCH /api/chat/:contractId/messages/read
  Future<void> markMessagesRead(String contractId) async {
    try {
      await _apiClient.patch('/api/chat/$contractId/messages/read');
    } catch (_) {
      // Non-critical — silently swallow read-receipt errors
    }
  }

  // ── HTTP: Get Nutritionist's Active Contracts ──────────────────────────────

  /// GET /api/nutritionist/contracts/active
  /// Returns all active consultation contracts for the authenticated nutritionist,
  /// enriched with customer user info and unread message counts.
  Future<List<Map<String, dynamic>>> fetchActiveContracts() async {
      final response =
          await _apiClient.get('/api/nutritionist/contracts/active');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'] as List<dynamic>? ?? [];
        return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
      }

      throw AppError(
        response.data['error']?['message'] ?? 'Failed to fetch clients.',
      );
  }

  // ── Socket.IO: Connection Lifecycle ───────────────────────────────────────

  /// Connect to the Socket.IO server with the user's JWT token.
  /// Call this once when the chat screen is opened.
  void connect(String token) {
    if (_socket != null && (_socket!.connected)) return;

    final serverUrl = _apiClient.dio.options.baseUrl;

    _socket = socket_io.io(
      serverUrl,
      socket_io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .enableForceNew()
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.connect();
  }

  /// Disconnect and clean up the socket. Called on screen dispose.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  /// Whether the socket is currently connected.
  bool get isConnected => _socket?.connected ?? false;

  // ── Socket.IO: Emit Events ─────────────────────────────────────────────────

  /// Emit `join_room` to subscribe to the private chat room.
  void joinRoom(String contractId) {
    _socket?.emit('join_room', {'contract_id': contractId});
  }

  /// Emit `send_message` with a text payload.
  Future<void> sendTextMessage(String contractId, String content) {
    if (_socket == null) return Future.error(Exception('Socket not initialized'));

    final completer = Completer<void>();

    _socket!.emitWithAck(
      'send_message',
      {
        'contract_id': contractId,
        'content': content,
        'type': 'text',
      },
      ack: (dynamic response) {
        if (response is Map) {
          if (response['success'] == true) {
            completer.complete();
          } else {
            final errorMsg = response['error']?['message'] ?? 'Failed to send message';
            completer.completeError(Exception(errorMsg));
          }
        } else {
          completer.complete();
        }
      },
    );

    return completer.future;
  }

  /// Emit `mark_read` to acknowledge reading messages.
  void emitMarkRead(String contractId) {
    _socket?.emit('mark_read', {'contract_id': contractId});
  }

  // ── Socket.IO: Listen to Events ───────────────────────────────────────────

  /// Register a callback for incoming `new_message` events.
  void onNewMessage(void Function(ChatMessageModel msg) callback) {
    _socket?.on('new_message', (data) {
      try {
        final msg = ChatMessageModel.fromSocketPayload(
          Map<String, dynamic>.from(data as Map),
        );
        callback(msg);
      } catch (e) {
        // Malformed payload — skip
      }
    });
  }

  /// Register a callback for `messages_read` events.
  void onMessagesRead(
    void Function(String contractId, String readerId) callback,
  ) {
    _socket?.on('messages_read', (data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        callback(
          map['contract_id']?.toString() ?? '',
          map['reader_id']?.toString() ?? '',
        );
      } catch (_) {}
    });
  }

  /// Register a callback for socket errors from the server.
  void onSocketError(void Function(String code, String message) callback) {
    _socket?.on('error', (data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        callback(
          map['code']?.toString() ?? 'UNKNOWN',
          map['message']?.toString() ?? 'Socket error.',
        );
      } catch (_) {}
    });
  }

  /// Called when the socket successfully joins a room.
  void onRoomJoined(void Function(String contractId) callback) {
    _socket?.on('room_joined', (data) {
      try {
        final map = Map<String, dynamic>.from(data as Map);
        callback(map['contract_id']?.toString() ?? '');
      } catch (_) {}
    });
  }

  /// Remove all event listeners (clean up before re-registering).
  void removeAllListeners() {
    _socket?.clearListeners();
  }
}

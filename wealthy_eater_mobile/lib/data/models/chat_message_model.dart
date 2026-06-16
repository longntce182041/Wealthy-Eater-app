/// chat_message_model.dart — Data-layer model for a single ConsultationMessage.
///
/// Mirrors the backend `ConsultationMessage` Mongoose schema.
/// Used by [ChatService] (HTTP + Socket.IO) and consumed by [ChatProvider].
library;

import 'package:flutter/foundation.dart' show kIsWeb;
import '../../core/config/env_config.dart';

/// The type of a chat message, matching the backend enum.
enum MessageType {
  text,
  image,
  systemAlert;

  /// Parse a raw string value from JSON / socket payload.
  static MessageType fromString(String? raw) {
    switch (raw) {
      case 'image':
        return MessageType.image;
      case 'system alert':
        return MessageType.systemAlert;
      case 'text':
      default:
        return MessageType.text;
    }
  }

  /// Serialise back to the backend-expected string.
  String get value {
    switch (this) {
      case MessageType.image:
        return 'image';
      case MessageType.systemAlert:
        return 'system alert';
      case MessageType.text:
        return 'text';
    }
  }
}

/// Represents one message in a consultation chat room.
class ChatMessageModel {
  /// Mongo ObjectID (String format).
  final String id;

  /// The `ConsultationContract._id` this message belongs to.
  final String contractId;

  /// The `User._id` who sent the message.
  final String senderId;

  /// Optional display name, populated when the API enriches the response.
  final String? senderName;

  /// Type: text, image, or system alert.
  final MessageType type;

  /// For [MessageType.text]: the message body.
  /// For [MessageType.image]: the absolute or relative URL of the image.
  /// For [MessageType.systemAlert]: the alert string.
  final String content;

  /// Whether the recipient has read this message.
  final bool isRead;

  /// When the message was read (null if not yet read).
  final DateTime? readAt;

  /// Server creation timestamp — used for ordering and date-separators.
  final DateTime createdAt;

  const ChatMessageModel({
    required this.id,
    required this.contractId,
    required this.senderId,
    this.senderName,
    required this.type,
    required this.content,
    required this.isRead,
    this.readAt,
    required this.createdAt,
  });

  // ── Factories ───────────────────────────────────────────────────────────────

  /// Parse from a REST API JSON object.
  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    final type = MessageType.fromString(json['messages_type']?.toString());
    String content = json['content']?.toString() ?? '';

    if (type == MessageType.image) {
      if (content.startsWith('http://localhost') || content.startsWith('http://127.0.0.1')) {
        final uri = Uri.tryParse(content);
        if (uri != null) {
          final baseUrl = kIsWeb ? 'http://localhost:5000' : EnvConfig.baseUrl;
          content = '$baseUrl${uri.path}';
        }
      } else if (content.startsWith('/')) {
        final baseUrl = kIsWeb ? 'http://localhost:5000' : EnvConfig.baseUrl;
        content = '$baseUrl$content';
      }
    }

    return ChatMessageModel(
      id: json['_id']?.toString() ?? '',
      contractId: json['contract_id']?.toString() ?? '',
      senderId: json['sender_id']?.toString() ?? '',
      senderName: json['sender_name']?.toString(),
      type: type,
      content: content,
      isRead: json['is_read'] as bool? ?? false,
      readAt: json['read_at'] != null
          ? DateTime.tryParse(json['read_at'].toString())
          : null,
      createdAt: json['create_at'] != null
          ? DateTime.tryParse(json['create_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  /// Parse from a Socket.IO event payload (same shape as REST response).
  factory ChatMessageModel.fromSocketPayload(Map<String, dynamic> payload) {
    return ChatMessageModel.fromJson(payload);
  }

  /// Serialise to a Socket.IO `send_message` payload.
  Map<String, dynamic> toSocketPayload() {
    return {
      'contract_id': contractId,
      'content': content,
      'type': type.value,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /// Returns true if this message was sent by [currentUserId].
  bool isSentByMe(String currentUserId) => senderId == currentUserId;

  /// Returns true if this message is an image type.
  bool get isImage => type == MessageType.image;

  /// Returns true if this is a system/informational alert.
  bool get isSystemAlert => type == MessageType.systemAlert;

  /// CopyWith for optimistic updates (e.g., marking as read).
  ChatMessageModel copyWith({
    bool? isRead,
    DateTime? readAt,
    String? senderName,
  }) {
    return ChatMessageModel(
      id: id,
      contractId: contractId,
      senderId: senderId,
      senderName: senderName ?? this.senderName,
      type: type,
      content: content,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt,
    );
  }

  @override
  String toString() =>
      'ChatMessageModel(id: $id, type: ${type.value}, senderId: $senderId)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ChatMessageModel &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

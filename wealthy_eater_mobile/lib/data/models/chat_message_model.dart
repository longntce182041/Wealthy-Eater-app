import '../../domain/entities/chat.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../core/config/env_config.dart';

class ChatMessageModel extends ChatMessageEntity {
  const ChatMessageModel({
    required super.id,
    required super.contractId,
    required super.senderId,
    super.senderName,
    required MessageTypeEntity super.type,
    required super.content,
    required super.isRead,
    super.readAt,
    required super.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    final rawType = json['messages_type']?.toString();
    MessageTypeEntity type = MessageTypeEntity.text;
    if (rawType == 'image') {
      type = MessageTypeEntity.image;
    } else if (rawType == 'system alert') {
      type = MessageTypeEntity.systemAlert;
    }

    String content = json['content']?.toString() ?? '';

    if (type == MessageTypeEntity.image) {
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

  factory ChatMessageModel.fromSocketPayload(Map<String, dynamic> payload) {
    return ChatMessageModel.fromJson(payload);
  }

  Map<String, dynamic> toSocketPayload() {
    String typeVal = 'text';
    if (type == MessageTypeEntity.image) {
      typeVal = 'image';
    } else if (type == MessageTypeEntity.systemAlert) {
      typeVal = 'system alert';
    }

    return {
      'contract_id': contractId,
      'content': content,
      'type': typeVal,
    };
  }

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
}

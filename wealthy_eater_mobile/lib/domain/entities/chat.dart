enum MessageTypeEntity { text, image, systemAlert }

class ChatMessageEntity {
  final String id;
  final String contractId;
  final String senderId;
  final String? senderName;
  final MessageTypeEntity type;
  final String content;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;

  const ChatMessageEntity({
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

  bool isSentByMe(String currentUserId) => senderId == currentUserId;
  bool get isImage => type == MessageTypeEntity.image;
  bool get isSystemAlert => type == MessageTypeEntity.systemAlert;

  ChatMessageEntity copyWith({
    bool? isRead,
    DateTime? readAt,
    String? senderName,
  }) {
    return ChatMessageEntity(
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

class ChatHistoryEntity {
  final List<ChatMessageEntity> messages;
  final int total;
  final bool hasMore;
  final int page;

  const ChatHistoryEntity({
    required this.messages,
    required this.total,
    required this.hasMore,
    required this.page,
  });
}

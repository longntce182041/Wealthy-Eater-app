import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/error/app_error.dart';
import '../../domain/entities/chat.dart';
import '../../domain/usecases/chat_usecases.dart';

/// Represents the loading state of the initial message history.
enum ChatLoadState { initial, loading, loaded, error }

class ChatProvider extends ChangeNotifier {
  final FetchActiveContractsUseCase fetchActiveContractsUseCase;
  final FetchMessageHistoryUseCase fetchMessageHistoryUseCase;
  final UploadChatImageUseCase uploadChatImageUseCase;
  final MarkChatMessagesReadUseCase markChatMessagesReadUseCase;
  final ConnectChatSocketUseCase connectChatSocketUseCase;
  final DisconnectChatSocketUseCase disconnectChatSocketUseCase;
  final GetChatSocketConnectedUseCase getChatSocketConnectedUseCase;
  final JoinChatRoomUseCase joinChatRoomUseCase;
  final SendChatTextMessageUseCase sendChatTextMessageUseCase;
  final EmitChatMarkReadUseCase emitChatMarkReadUseCase;
  final ListenChatNewMessageUseCase listenChatNewMessageUseCase;
  final ListenChatMessagesReadUseCase listenChatMessagesReadUseCase;
  final ListenChatSocketErrorUseCase listenChatSocketErrorUseCase;
  final ListenChatRoomJoinedUseCase listenChatRoomJoinedUseCase;
  final RemoveChatAllListenersUseCase removeChatAllListenersUseCase;

  ChatProvider({
    required this.fetchActiveContractsUseCase,
    required this.fetchMessageHistoryUseCase,
    required this.uploadChatImageUseCase,
    required this.markChatMessagesReadUseCase,
    required this.connectChatSocketUseCase,
    required this.disconnectChatSocketUseCase,
    required this.getChatSocketConnectedUseCase,
    required this.joinChatRoomUseCase,
    required this.sendChatTextMessageUseCase,
    required this.emitChatMarkReadUseCase,
    required this.listenChatNewMessageUseCase,
    required this.listenChatMessagesReadUseCase,
    required this.listenChatSocketErrorUseCase,
    required this.listenChatRoomJoinedUseCase,
    required this.removeChatAllListenersUseCase,
  });

  // ── State ──────────────────────────────────────────────────────────────────
  String? _contractId;
  String? _activeToken;
  List<ChatMessageEntity> _messages = [];
  ChatLoadState _loadState = ChatLoadState.initial;
  bool _isSendingText = false;
  bool _isUploadingImage = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _errorMessage;
  bool _isConnected = false;

  // ── Getters ────────────────────────────────────────────────────────────────
  String? get contractId => _contractId;

  /// Messages are stored in chronological order (oldest first) for display.
  List<ChatMessageEntity> get messages => _messages;
  ChatLoadState get loadState => _loadState;
  bool get isSendingText => _isSendingText;
  bool get isUploadingImage => _isUploadingImage;
  bool get isSending => _isSendingText || _isUploadingImage;
  bool get hasMore => _hasMore;
  bool get isConnected => _isConnected;
  String? get errorMessage => _errorMessage;

  // ── Nutritionist: Active Contracts List ───────────────────────────────────

  /// Fetch active consultation contracts for the authenticated nutritionist.
  Future<List<Map<String, dynamic>>> fetchActiveContracts() async {
    try {
      return await fetchActiveContractsUseCase();
    } catch (e) {
      debugPrint('[ChatProvider] fetchActiveContracts error: $e');
      return [];
    }
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /// Must be called when the chat screen opens.
  Future<void> initChat(String contractId, String token) async {
    if (_contractId == contractId && _activeToken == token) return; // Already initialized

    if (_activeToken != null && _activeToken != token) {
      removeChatAllListenersUseCase();
      disconnectChatSocketUseCase();
    }

    _contractId = contractId;
    _activeToken = token;
    _messages = [];
    _currentPage = 1;
    _hasMore = true;
    _errorMessage = null;
    _loadState = ChatLoadState.loading;
    notifyListeners();

    // 1. Fetch initial history
    await _loadHistory(isInitial: true);

    // 2. Connect socket
    connectChatSocketUseCase(token);
    removeChatAllListenersUseCase();

    listenChatRoomJoinedUseCase((roomId) {
      debugPrint('[ChatProvider] Joined room: $roomId');
      _isConnected = true;
      notifyListeners();
    });

    listenChatNewMessageUseCase((msg) {
      _onNewMessageReceived(msg);
    });

    listenChatMessagesReadUseCase((cId, readerId) {
      if (cId == _contractId) {
        _markLocalMessagesRead(readerId);
      }
    });

    listenChatSocketErrorUseCase((code, message) {
      debugPrint('[ChatProvider] Socket error [$code]: $message');
      _errorMessage = message;
      notifyListeners();
    });

    // 3. Join the private room
    joinChatRoomUseCase(contractId);
  }

  // ── Load History (Pagination) ──────────────────────────────────────────────

  Future<void> _loadHistory({bool isInitial = false}) async {
    if (_contractId == null) return;
    try {
      final result = await fetchMessageHistoryUseCase(
        _contractId!,
        page: _currentPage,
        limit: 30,
      );

      // API returns newest-first; reverse for chronological display
      final chronological = result.messages.reversed.toList();

      if (isInitial) {
        _messages = chronological;
        _loadState = ChatLoadState.loaded;
      } else {
        // Prepend older messages
        _messages = [...chronological, ..._messages];
      }

      _hasMore = result.hasMore;
      _currentPage = result.page + 1;
    } catch (e) {
      if (isInitial) {
        _loadState = ChatLoadState.error;
        _errorMessage = mapError(e).message;
      }
      debugPrint('[ChatProvider] Failed to load history: $e');
    }
    notifyListeners();
  }

  /// Load the next page of older messages (called when user scrolls to top).
  Future<void> loadMoreMessages() async {
    if (!_hasMore || _loadState == ChatLoadState.loading) return;
    await _loadHistory();
  }

  // ── Send Text Message ──────────────────────────────────────────────────────

  /// Sends a text message via Socket.IO.
  Future<void> sendTextMessage({
    required String content,
    required String currentUserId,
  }) async {
    if (content.trim().isEmpty || _contractId == null) return;

    _isSendingText = true;
    notifyListeners();

    try {
      await sendChatTextMessageUseCase(_contractId!, content.trim());
    } catch (e) {
      _errorMessage = mapError(e).message;
      debugPrint('[ChatProvider] sendTextMessage error: $e');
    } finally {
      _isSendingText = false;
      notifyListeners();
    }
  }

  // ── Upload Image ───────────────────────────────────────────────────────────

  /// Uploads a meal image via HTTP POST.
  Future<void> sendImageMessage({
    required File imageFile,
    required String currentUserId,
  }) async {
    if (_contractId == null) return;

    _isUploadingImage = true;
    notifyListeners();

    try {
      await uploadChatImageUseCase(_contractId!, imageFile);
    } catch (e) {
      _errorMessage = mapError(e).message;
      debugPrint('[ChatProvider] sendImageMessage error: $e');
      notifyListeners();
    } finally {
      _isUploadingImage = false;
      notifyListeners();
    }
  }

  // ── Mark Read ──────────────────────────────────────────────────────────────

  /// Marks all received messages as read.
  Future<void> markRead() async {
    if (_contractId == null) return;
    await markChatMessagesReadUseCase(_contractId!);
    emitChatMarkReadUseCase(_contractId!);
  }

  // ── Private: Socket Event Handlers ────────────────────────────────────────

  void _onNewMessageReceived(ChatMessageEntity msg) {
    if (_messages.any((m) => m.id == msg.id)) return;
    _messages = [..._messages, msg];
    notifyListeners();
  }

  void _markLocalMessagesRead(String readerUserId) {
    _messages = _messages.map((msg) {
      if (msg.senderId != readerUserId && !msg.isRead) {
        return msg.copyWith(isRead: true, readAt: DateTime.now());
      }
      return msg;
    }).toList();
    notifyListeners();
  }

  // ── Clear Error ────────────────────────────────────────────────────────────

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // ── Dispose ────────────────────────────────────────────────────────────────

  @override
  void dispose() {
    removeChatAllListenersUseCase();
    disconnectChatSocketUseCase();
    super.dispose();
  }

  /// Reset state for a different contract
  void resetChat() {
    _contractId = null;
    _activeToken = null;
    _messages = [];
    _currentPage = 1;
    _hasMore = true;
    _errorMessage = null;
    _loadState = ChatLoadState.initial;
    _isConnected = false;
    removeChatAllListenersUseCase();
    disconnectChatSocketUseCase();
    notifyListeners();
  }
}

/// Helper: read the access token from secure storage.
Future<String?> readAccessToken() async {
  const storage = FlutterSecureStorage();
  return storage.read(key: 'accessToken');
}

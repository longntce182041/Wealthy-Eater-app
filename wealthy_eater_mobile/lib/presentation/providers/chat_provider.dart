/// chat_provider.dart — State management for the Consultation Chat feature.
///
/// Manages:
///  - Paginated message history (with optimistic updates for sent messages).
///  - Socket.IO lifecycle (connect on init, disconnect on dispose).
///  - Text message sending (via socket).
///  - Image uploading (via HTTP, with socket broadcast by backend).
///  - Read receipt tracking (local + HTTP + socket).
library;

import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/network/api_client.dart';
import '../../core/error/app_error.dart';
import '../../data/models/chat_message_model.dart';
import '../../data/services/chat_service.dart';

/// Represents the loading state of the initial message history.
enum ChatLoadState { initial, loading, loaded, error }

class ChatProvider extends ChangeNotifier {
  final ChatService _service;

  ChatProvider({required ApiClient api})
      : _service = ChatService(apiClient: api);

  // ── State ──────────────────────────────────────────────────────────────────
  String? _contractId;
  String? _activeToken;
  List<ChatMessageModel> _messages = [];
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
  List<ChatMessageModel> get messages => _messages;
  ChatLoadState get loadState => _loadState;
  bool get isSendingText => _isSendingText;
  bool get isUploadingImage => _isUploadingImage;
  bool get isSending => _isSendingText || _isUploadingImage;
  bool get hasMore => _hasMore;
  bool get isConnected => _isConnected;
  String? get errorMessage => _errorMessage;

  // ── Nutritionist: Active Contracts List ───────────────────────────────────

  /// Fetch active consultation contracts for the authenticated nutritionist.
  /// Used by the nutritionist's Clients tab.
  Future<List<Map<String, dynamic>>> fetchActiveContracts() async {
    return _service.fetchActiveContracts();
  }

  // ── Initialisation ─────────────────────────────────────────────────────────

  /// Must be called when the chat screen opens.
  ///
  /// [contractId] — the ConsultationContract._id (defines the room).
  /// [currentUserId] — req.user.id of the logged-in user.
  /// [token] — JWT access token for socket handshake.
  Future<void> initChat(String contractId, String token) async {
    if (_contractId == contractId && _activeToken == token) return; // Already initialized for this room

    if (_activeToken != null && _activeToken != token) {
      _service.removeAllListeners();
      _service.disconnect();
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
    _service.connect(token);
    _service.removeAllListeners();

    _service.onRoomJoined((roomId) {
      debugPrint('[ChatProvider] Joined room: $roomId');
      _isConnected = true;
      notifyListeners();
    });

    _service.onNewMessage((msg) {
      _onNewMessageReceived(msg);
    });

    _service.onMessagesRead((cId, readerId) {
      if (cId == _contractId) {
        _markLocalMessagesRead(readerId);
      }
    });

    _service.onSocketError((code, message) {
      debugPrint('[ChatProvider] Socket error [$code]: $message');
      _errorMessage = message;
      notifyListeners();
    });

    // 3. Join the private room
    _service.joinRoom(contractId);
  }

  // ── Load History (Pagination) ──────────────────────────────────────────────

  Future<void> _loadHistory({bool isInitial = false}) async {
    if (_contractId == null) return;
    try {
      final result = await _service.fetchMessageHistory(
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
        // Prepend older messages (they go before the existing ones)
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
  /// Adds an optimistic local message immediately for instant UI feedback.
  Future<void> sendTextMessage({
    required String content,
    required String currentUserId,
  }) async {
    if (content.trim().isEmpty || _contractId == null) return;

    _isSendingText = true;
    notifyListeners();

    try {
      await _service.sendTextMessage(_contractId!, content.trim());
      // The real message will arrive via the onNewMessage socket event.
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
  /// The backend saves it and broadcasts the image message via socket,
  /// so both parties see it in real-time.
  Future<void> sendImageMessage({
    required File imageFile,
    required String currentUserId,
  }) async {
    if (_contractId == null) return;

    _isUploadingImage = true;
    notifyListeners();

    try {
      // HTTP upload (backend broadcasts via socket after saving)
      await _service.uploadImage(_contractId!, imageFile);
      // The image message will arrive via the onNewMessage socket event
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

  /// Marks all received messages as read. Call when the screen is visible.
  Future<void> markRead() async {
    if (_contractId == null) return;
    // Fire and forget
    _service.markMessagesRead(_contractId!);
    _service.emitMarkRead(_contractId!);
  }

  // ── Private: Socket Event Handlers ────────────────────────────────────────

  void _onNewMessageReceived(ChatMessageModel msg) {
    // Avoid duplicates (e.g. if the socket echoes a message we already added)
    if (_messages.any((m) => m.id == msg.id)) return;
    _messages = [..._messages, msg];
    notifyListeners();
  }

  void _markLocalMessagesRead(String readerUserId) {
    // Update messages sent by the current user that have been read by the other party
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
    _service.removeAllListeners();
    _service.disconnect();
    super.dispose();
  }

  /// Reset state for a different contract (e.g., navigating to another chat).
  void resetChat() {
    _contractId = null;
    _activeToken = null;
    _messages = [];
    _currentPage = 1;
    _hasMore = true;
    _errorMessage = null;
    _loadState = ChatLoadState.initial;
    _isConnected = false;
    _service.removeAllListeners();
    _service.disconnect();
    notifyListeners();
  }
}

/// Helper: read the access token from secure storage.
/// Used to pass the token to the socket handshake.
Future<String?> readAccessToken() async {
  const storage = FlutterSecureStorage();
  return storage.read(key: 'accessToken');
}

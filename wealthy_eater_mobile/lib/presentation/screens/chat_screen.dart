/// chat_screen.dart — Full real-time chat UI for the Consultation feature.
///
/// Used by both:
///  - Customer: tapping "Chat" in MyNutritionistDashboard.
///  - Nutritionist: tapping a client in the Clients tab.
///
/// Parameters:
///  - [contractId]  : The ConsultationContract._id (Socket.IO room key).
///  - [currentUserId]: The logged-in user's ID (for bubble alignment).
///  - [peerName]    : Display name of the other party (AppBar title).
///  - [peerInitials]: 2-letter initials for the default avatar.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../core/theme/app_colors.dart';
import '../../data/models/chat_message_model.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';

class ChatScreen extends StatefulWidget {
  final String contractId;
  final String peerName;
  final String peerInitials;

  const ChatScreen({
    super.key,
    required this.contractId,
    required this.peerName,
    required this.peerInitials,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  bool _isLoadingMore = false;
  late ChatProvider _chatProvider;

  @override
  void initState() {
    super.initState();
    _chatProvider = context.read<ChatProvider>();
    WidgetsBinding.instance.addObserver(this);
    _initChat();
    _scrollController.addListener(_onScroll);
  }

  Future<void> _initChat() async {
    final token = await readAccessToken();
    if (token == null || !mounted) return;

    await _chatProvider.initChat(widget.contractId, token);

    // Mark messages read when screen opens
    if (mounted) {
      _chatProvider.markRead();
    }
  }

  void _onScroll() {
    // Load more when user scrolls to the top (oldest messages)
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 80 &&
        !_isLoadingMore) {
      _loadMoreMessages();
    }
  }

  Future<void> _loadMoreMessages() async {
    if (!_chatProvider.hasMore) return;
    setState(() => _isLoadingMore = true);
    await _chatProvider.loadMoreMessages();
    if (mounted) setState(() => _isLoadingMore = false);
  }

  Future<void> _sendText() async {
    final content = _textController.text.trim();
    if (content.isEmpty) return;

    final userId = context.read<AuthProvider>().user?.id ?? '';
    _textController.clear();

    await _chatProvider.sendTextMessage(
          content: content,
          currentUserId: userId,
        );
    _scrollToBottom();
  }

  Future<void> _pickAndSendImage() async {
    final XFile? picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (picked == null || !mounted) return;

    final userId = context.read<AuthProvider>().user?.id ?? '';
    await _chatProvider.sendImageMessage(
          imageFile: picked,
          currentUserId: userId,
        );
    if (mounted) _scrollToBottom();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _textController.dispose();
    _scrollController.dispose();
    
    Future.microtask(() => _chatProvider.resetChat());
    
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F3),
      appBar: _buildAppBar(context),
      body: Column(
        children: [
          Expanded(child: _buildMessageList()),
          _buildInputBar(),
        ],
      ),
    );
  }

  // ── AppBar ──────────────────────────────────────────────────────────────────

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      elevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: AppColors.textPrimary,
      titleSpacing: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      title: Row(
        children: [
          // Avatar
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.secondary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Center(
              child: Text(
                widget.peerInitials,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Name + status
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.peerName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Consumer<ChatProvider>(
                  builder: (_, chat, __) => Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: chat.isConnected
                              ? const Color(0xFF4CAF50)
                              : Colors.grey.shade400,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        chat.isConnected ? 'Online' : 'Connecting…',
                        style: TextStyle(
                          fontSize: 11,
                          color: chat.isConnected
                              ? const Color(0xFF4CAF50)
                              : Colors.grey.shade500,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Message List ─────────────────────────────────────────────────────────────

  Widget _buildMessageList() {
    final userId = context.read<AuthProvider>().user?.id ?? '';

    return Consumer<ChatProvider>(
      builder: (context, chat, _) {
        if (chat.loadState == ChatLoadState.loading) {
          return _buildLoadingSkeleton();
        }

        if (chat.loadState == ChatLoadState.error) {
          return _buildErrorState(chat.errorMessage ?? 'Failed to load messages.');
        }

        if (chat.messages.isEmpty) {
          return _buildEmptyState();
        }

        // Show error snackbar for send failures
        if (chat.errorMessage != null) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(chat.errorMessage!),
                backgroundColor: AppColors.error,
                action: SnackBarAction(
                  label: 'Dismiss',
                  textColor: Colors.white,
                  onPressed: chat.clearError,
                ),
              ),
            );
            chat.clearError();
          });
        }

        final msgs = chat.messages;
        final itemCount = _isLoadingMore ? msgs.length + 1 : msgs.length;

        return ListView.builder(
          reverse: true,
          controller: _scrollController,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: itemCount,
          itemBuilder: (context, index) {
            // Loading indicator at top (end of the reversed list)
            if (_isLoadingMore && index == itemCount - 1) {
              return const Padding(
                padding: EdgeInsets.all(8),
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              );
            }

            final msgIndex = index;
            final msg = msgs[msgIndex];
            // The previous chronological message is the older one (next in list)
            final prevMsg = (msgIndex + 1 < msgs.length) ? msgs[msgIndex + 1] : null;

            final showDateSeparator = prevMsg == null ||
                !_isSameDay(prevMsg.createdAt, msg.createdAt);

            return Column(
              children: [
                if (showDateSeparator) _buildDateSeparator(msg.createdAt),
                _MessageBubble(
                  msg: msg,
                  currentUserId: userId,
                  peerInitials: widget.peerInitials,
                  onImageTap: _openFullscreenImage,
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ── Date Separator ───────────────────────────────────────────────────────────

  Widget _buildDateSeparator(DateTime date) {
    final now = DateTime.now();
    String label;
    if (_isSameDay(date, now)) {
      label = 'Today';
    } else if (_isSameDay(date, now.subtract(const Duration(days: 1)))) {
      label = 'Yesterday';
    } else {
      // Simple manual format: e.g. "June 14, 2026"
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      label = '${months[date.month - 1]} ${date.day}, ${date.year}';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          const Expanded(child: Divider(color: Color(0xFFDDE5E0))),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ),
          const Expanded(child: Divider(color: Color(0xFFDDE5E0))),
        ],
      ),
    );
  }

  // ── Input Bar ────────────────────────────────────────────────────────────────

  Widget _buildInputBar() {
    return Consumer<ChatProvider>(
      builder: (context, chat, _) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, -3),
              ),
            ],
          ),
          padding: EdgeInsets.only(
            left: 16,
            right: 12,
            top: 10,
            bottom: MediaQuery.of(context).padding.bottom + 10,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Image picker button
              GestureDetector(
                onTap: chat.isSending ? null : _pickAndSendImage,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: chat.isUploadingImage
                        ? AppColors.primaryLight
                        : const Color(0xFFF0F4F3),
                    shape: BoxShape.circle,
                  ),
                  child: chat.isUploadingImage
                      ? const Padding(
                          padding: EdgeInsets.all(10),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        )
                      : const Icon(
                          Icons.image_outlined,
                          color: AppColors.primary,
                          size: 22,
                        ),
                ),
              ),
              const SizedBox(width: 10),
              // Text input
              Expanded(
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 120),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F4F3),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: TextField(
                    controller: _textController,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    textCapitalization: TextCapitalization.sentences,
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.textPrimary,
                    ),
                    decoration: const InputDecoration(
                      hintText: 'Type a message…',
                      hintStyle: TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 15,
                      ),
                      border: InputBorder.none,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    onSubmitted: (_) => _sendText(),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Send button
              GestureDetector(
                onTap: chat.isSendingText ? null : _sendText,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: chat.isSendingText
                        ? null
                        : const LinearGradient(
                            colors: [AppColors.primary, Color(0xFF2E7D5C)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                    color: chat.isSendingText ? AppColors.primaryLight : null,
                    shape: BoxShape.circle,
                    boxShadow: chat.isSendingText
                        ? null
                        : [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.35),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                  ),
                  child: chat.isSendingText
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.primary,
                          ),
                        )
                      : const Icon(
                          Icons.send_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ── Loading / Empty / Error States ──────────────────────────────────────────

  Widget _buildLoadingSkeleton() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: 8,
      itemBuilder: (_, index) {
        final isMine = index % 3 != 0;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(
            mainAxisAlignment:
                isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              if (!isMine)
                Container(
                  width: 28,
                  height: 28,
                  margin: const EdgeInsets.only(right: 6),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.grey.shade200,
                  ),
                ),
              Container(
                width: (index % 2 == 0) ? 200 : 140,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.chat_bubble_outline_rounded,
              size: 40,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No messages yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start the conversation by\nsending your first message!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _initChat,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Retry'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }

  // ── Fullscreen Image Viewer ──────────────────────────────────────────────────

  void _openFullscreenImage(String imageUrl) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _FullscreenImageViewer(imageUrl: imageUrl),
      ),
    );
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;


}

// ── Extracted Widgets ──────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final ChatMessageModel msg;
  final String currentUserId;
  final String peerInitials;
  final void Function(String) onImageTap;

  const _MessageBubble({
    required this.msg,
    required this.currentUserId,
    required this.peerInitials,
    required this.onImageTap,
  });

  @override
  Widget build(BuildContext context) {
    if (msg.isSystemAlert) {
      return _buildSystemAlert();
    }

    final isMine = msg.isSentByMe(currentUserId);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMine) ...[
            // Peer avatar (small)
            Container(
              width: 28,
              height: 28,
              margin: const EdgeInsets.only(right: 6, bottom: 2),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                ),
              ),
              child: Center(
                child: Text(
                  peerInitials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              child: Column(
                crossAxisAlignment:
                    isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                children: [
                  // Bubble
                  Container(
                    decoration: BoxDecoration(
                      color: isMine ? AppColors.primary : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(18),
                        topRight: const Radius.circular(18),
                        bottomLeft: isMine ? const Radius.circular(18) : const Radius.circular(4),
                        bottomRight: isMine ? const Radius.circular(4) : const Radius.circular(18),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: msg.isImage ? _buildImageBubble() : _buildTextBubble(isMine),
                  ),
                  const SizedBox(height: 2),
                  // Timestamp + read receipt
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTime(msg.createdAt),
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey.shade500,
                        ),
                      ),
                      if (isMine) ...[
                        const SizedBox(width: 3),
                        Icon(
                          msg.isRead ? Icons.done_all_rounded : Icons.done_rounded,
                          size: 13,
                          color: msg.isRead ? AppColors.primary : Colors.grey.shade400,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextBubble(bool isMine) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Text(
        msg.content,
        style: TextStyle(
          color: isMine ? Colors.white : AppColors.textPrimary,
          fontSize: 15,
          height: 1.4,
        ),
      ),
    );
  }

  Widget _buildImageBubble() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: GestureDetector(
        onTap: () => onImageTap(msg.content),
        child: CachedNetworkImage(
          imageUrl: msg.content,
          width: 220,
          height: 220,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            width: 220,
            height: 220,
            color: AppColors.primaryLight,
            child: const Center(
              child: CircularProgressIndicator(
                color: AppColors.primary,
                strokeWidth: 2,
              ),
            ),
          ),
          errorWidget: (context, url, error) => Container(
            width: 220,
            height: 120,
            color: AppColors.primaryLight,
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.broken_image_outlined, color: AppColors.primary, size: 32),
                  SizedBox(height: 4),
                  Text('Image unavailable', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSystemAlert() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        msg.content,
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.textSecondary,
          fontStyle: FontStyle.italic,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  String _formatTime(DateTime date) {
    final hr = date.hour.toString().padLeft(2, '0');
    final mn = date.minute.toString().padLeft(2, '0');
    return '$hr:$mn';
  }
}

// ── Fullscreen Image Viewer ──────────────────────────────────────────────────

class _FullscreenImageViewer extends StatelessWidget {
  final String imageUrl;
  const _FullscreenImageViewer({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        actions: [
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 5.0,
          child: Image.network(
            imageUrl,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const Icon(
              Icons.broken_image_outlined,
              color: Colors.white54,
              size: 64,
            ),
          ),
        ),
      ),
    );
  }
}

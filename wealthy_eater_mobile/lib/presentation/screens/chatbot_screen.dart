/// chatbot_screen.dart — AI Nutrition Chatbot UI (NutriBot).
///
/// UX Improvements:
///  - Markdown rendering for AI responses (bold, lists, code)
///  - Timestamps shown beneath each bubble
///  - Error messages shown via SnackBar (not polluting chat history)
///  - Long-press to copy any message content
///  - Bilingual suggestion chips (VN + EN)
///  - Keyboard-aware scroll behaviour
///  - Pull-to-refresh loads history
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';

import '../../data/models/chatbot_message_model.dart';
import '../providers/chatbot_provider.dart';
import '../../core/theme/app_colors.dart';

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen>
    with TickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _inputFocusNode = FocusNode();
  late AnimationController _dotAnimController;

  // Quick-suggestion prompts — all English (default app language)
  static const List<String> _suggestions = [
    'What should I eat today? 🍱',
    'Calculate my daily protein needs',
    'Suggest a low-calorie breakfast',
    'Create a 7-day meal plan for me',
    'How many calories should I eat?',
    'Foods I should avoid for my condition',
  ];

  @override
  void initState() {
    super.initState();

    _dotAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatbotProvider>().loadHistory().then((_) {
        _scrollToBottom();
      });
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _dotAnimController.dispose();
    _inputFocusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom({bool animate = false}) {
    if (!_scrollController.hasClients) return;
    if (animate) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    } else {
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
    }
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    _textController.clear();
    _inputFocusNode.unfocus();
    final provider = context.read<ChatbotProvider>();
    await provider.sendMessage(text);

    // Show error via SnackBar — keep chat history clean
    if (mounted && provider.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage!),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          action: SnackBarAction(
            label: 'Dismiss',
            textColor: Colors.white,
            onPressed: () {
              provider.clearError();
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
            },
          ),
        ),
      );
    }

    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _scrollToBottom(animate: true),
    );
  }

  Future<void> _confirmResetSession() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Start a new conversation?',
          style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'The current conversation history will be deleted. Continue?',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel',
                style: TextStyle(color: AppColors.textTertiary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Reset',
              style: TextStyle(
                  color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await context.read<ChatbotProvider>().resetSession();
    }
  }

  void _copyMessage(String content) {
    Clipboard.setData(ClipboardData(text: content));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Message copied to clipboard'),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: AppColors.textSecondary,
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          Expanded(child: _buildMessageList()),
          _buildInputBar(),
        ],
      ),
    );
  }

  // ── AppBar ────────────────────────────────────────────────────────────────

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: AppColors.surface,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            color: AppColors.textPrimary),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: Row(
        children: [
          _buildNutriBotAvatar(radius: 18),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'NutriBot',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                'AI Nutrition Assistant • Multilingual',
                style:
                    TextStyle(color: AppColors.textSecondary, fontSize: 10.5),
              ),
            ],
          ),
        ],
      ),
      actions: [
        Consumer<ChatbotProvider>(
          builder: (_, provider, __) => IconButton(
            tooltip: 'New conversation',
            icon: const Icon(Icons.add_comment_outlined,
                color: AppColors.textSecondary),
            onPressed: provider.isResetting ? null : _confirmResetSession,
          ),
        ),
      ],
    );
  }

  // ── NutriBot Avatar ───────────────────────────────────────────────────────

  Widget _buildNutriBotAvatar({double radius = 20}) {
    return Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Icon(
        Icons.psychology_rounded,
        color: AppColors.textOnPrimary,
        size: radius * 1.1,
      ),
    );
  }

  // ── Message List ──────────────────────────────────────────────────────────

  Widget _buildMessageList() {
    return Consumer<ChatbotProvider>(
      builder: (context, provider, _) {
        if (provider.loadState == ChatbotLoadState.loading &&
            !provider.hasMessages) {
          return const Center(
            child: CircularProgressIndicator(
              color: AppColors.primary,
              strokeWidth: 2.5,
            ),
          );
        }

        if (!provider.hasMessages && !provider.isSending) {
          return _buildEmptyState();
        }

        final allItems = [
          ...provider.messages,
          if (provider.isSending) null, // null = typing indicator
        ];

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () => provider.loadHistory(),
          child: ListView.builder(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: allItems.length,
            itemBuilder: (_, i) {
              final item = allItems[i];
              if (item == null) return _buildTypingIndicator();
              return _buildMessageBubble(item);
            },
          ),
        );
      },
    );
  }

  // ── Empty State ───────────────────────────────────────────────────────────

  Widget _buildEmptyState() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.3),
                    blurRadius: 20,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: const Icon(
                Icons.psychology_rounded,
                color: AppColors.textOnPrimary,
                size: 40,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Hello! I am NutriBot 👋',
              style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your personal AI nutrition assistant.\nAsk me anything — in any language!',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 28),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              alignment: WrapAlignment.center,
              children: _suggestions.map((s) => _buildSuggestionChip(s)).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionChip(String text) {
    return GestureDetector(
      onTap: () => _sendMessage(text),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: AppColors.primary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  // ── Message Bubble ────────────────────────────────────────────────────────

  Widget _buildMessageBubble(ChatbotMessageModel message) {
    final isUser = message.isUser;
    // Strip error prefix from display (errors now go via SnackBar, but keep
    // legacy ⚠️ messages styled differently just in case)
    final isError = message.content.startsWith('⚠️');

    return GestureDetector(
      onLongPress: () => _copyMessage(message.content),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment:
              isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment:
                  isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (!isUser) ...[
                  _buildNutriBotAvatar(radius: 15),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.78,
                    ),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isError
                          ? AppColors.error.withValues(alpha: 0.08)
                          : isUser
                              ? AppColors.primary
                              : AppColors.surface,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(18),
                        topRight: const Radius.circular(18),
                        bottomLeft: Radius.circular(isUser ? 18 : 4),
                        bottomRight: Radius.circular(isUser ? 4 : 18),
                      ),
                      border: isUser
                          ? null
                          : Border.all(
                              color: isError
                                  ? AppColors.error.withValues(alpha: 0.3)
                                  : AppColors.border,
                            ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    // AI messages use Markdown; user messages use plain text
                    child: isUser
                        ? Text(
                            message.content,
                            style: const TextStyle(
                              color: AppColors.textOnPrimary,
                              fontSize: 14.5,
                              height: 1.5,
                            ),
                          )
                        : MarkdownBody(
                            data: message.content,
                            styleSheet: MarkdownStyleSheet(
                              p: TextStyle(
                                color: isError
                                    ? AppColors.error
                                    : AppColors.textPrimary,
                                fontSize: 14.5,
                                height: 1.55,
                              ),
                              strong: const TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                              em: const TextStyle(
                                color: AppColors.textSecondary,
                                fontStyle: FontStyle.italic,
                              ),
                              listBullet: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 14.5,
                              ),
                              h3: const TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                              code: const TextStyle(
                                fontFamily: 'monospace',
                                backgroundColor: Color(0xFFEDF2EE),
                                fontSize: 13,
                              ),
                            ),
                            shrinkWrap: true,
                          ),
                  ),
                ),
                if (isUser) const SizedBox(width: 8),
              ],
            ),
            // Timestamp
            if (message.createdAt != null)
              Padding(
                padding: EdgeInsets.only(
                  top: 4,
                  left: isUser ? 0 : 46,
                  right: isUser ? 8 : 0,
                ),
                child: Text(
                  _formatTime(message.createdAt!),
                  style: const TextStyle(
                    color: AppColors.textTertiary,
                    fontSize: 10.5,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  // ── Typing Indicator ──────────────────────────────────────────────────────

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          _buildNutriBotAvatar(radius: 15),
          const SizedBox(width: 8),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border.all(color: AppColors.border),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomRight: Radius.circular(18),
                bottomLeft: Radius.circular(4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(3, (i) {
                return AnimatedBuilder(
                  animation: _dotAnimController,
                  builder: (_, __) {
                    final offset =
                        ((_dotAnimController.value + i / 3) % 1.0);
                    final y =
                        offset < 0.5 ? offset * 2 : (1.0 - offset) * 2;
                    return Transform.translate(
                      offset: Offset(0, -4 * y),
                      child: Container(
                        width: 7,
                        height: 7,
                        margin:
                            const EdgeInsets.symmetric(horizontal: 2.5),
                        decoration: BoxDecoration(
                          color:
                              AppColors.primary.withValues(alpha: 0.8),
                          shape: BoxShape.circle,
                        ),
                      ),
                    );
                  },
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  // ── Input Bar ─────────────────────────────────────────────────────────────

  Widget _buildInputBar() {
    return Consumer<ChatbotProvider>(
      builder: (context, provider, _) {
        return Container(
          padding: EdgeInsets.only(
            left: 16,
            right: 12,
            top: 10,
            bottom: MediaQuery.of(context).padding.bottom + 10,
          ),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 140),
                  child: TextField(
                    controller: _textController,
                    focusNode: _inputFocusNode,
                    enabled: !provider.isSending,
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (val) => _sendMessage(val),
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 14.5),
                    decoration: InputDecoration(
                      hintText: 'Ask NutriBot in any language...',
                      hintStyle: const TextStyle(
                        color: AppColors.textTertiary,
                        fontSize: 14,
                      ),
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide:
                            const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide:
                            const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(
                          color: AppColors.primary,
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: provider.isSending
                      ? null
                      : const LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  color: provider.isSending ? AppColors.border : null,
                ),
                child: IconButton(
                  icon: provider.isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: AppColors.primary,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(
                          Icons.send_rounded,
                          color: AppColors.textOnPrimary,
                          size: 20,
                        ),
                  onPressed: provider.isSending
                      ? null
                      : () => _sendMessage(_textController.text),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

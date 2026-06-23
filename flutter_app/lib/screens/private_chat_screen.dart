import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../widgets/app_theme.dart';
import '../widgets/avatar_widget.dart';

class PrivateChatScreen extends StatefulWidget {
  const PrivateChatScreen({super.key});

  @override
  State<PrivateChatScreen> createState() => _PrivateChatScreenState();
}

class _PrivateChatScreenState extends State<PrivateChatScreen> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    // Poll for new messages every 3 seconds (fallback for socket.io)
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _loadMessages();
    });
  }

  Future<void> _loadMessages() async {
    final provider = context.read<AppProvider>();
    if (provider.selectedPlayerId != null) {
      await provider.loadDirectMessages(provider.selectedPlayerId!);
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    final provider = context.read<AppProvider>();
    _textController.clear();
    if (provider.selectedPlayerId != null) {
      await provider.sendDirectMessage(provider.selectedPlayerId!, text);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();

    if (provider.selectedPlayerId == null) {
      provider.setView(AppView.privateChats);
      return const SizedBox.shrink();
    }

    final messages = provider.directMessages;

    // Find the other user info from contacts
    final contact = provider.contacts
        .where((c) => c.userId == provider.selectedPlayerId)
        .firstOrNull;
    final otherUsername = contact?.username ?? 'Пользователь';
    final otherAvatar = contact?.avatar ?? 'avatar-1';
    final otherCustomAvatar = contact?.customAvatar;
    final isOnline = provider.onlineUserIds.contains(provider.selectedPlayerId);

    if (messages.isNotEmpty) {
      _scrollToBottom();
    }

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.darkBg,
                  border: Border(
                    bottom: BorderSide(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () {
                        provider.loadContacts();
                        provider.setView(AppView.privateChats);
                      },
                    ),
                    GestureDetector(
                      onTap: () {
                        provider.setView(AppView.playerProfile);
                      },
                      child: Row(
                        children: [
                          Stack(
                            children: [
                              AvatarWidget(
                                avatar: otherAvatar,
                                customAvatar: otherCustomAvatar,
                                size: 36,
                              ),
                              Positioned(
                                bottom: -1,
                                right: -1,
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: isOnline
                                        ? AppTheme.primary
                                        : Colors.white.withValues(alpha: 0.3),
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppTheme.darkBg,
                                      width: 2,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                otherUsername,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                isOnline ? 'онлайн' : 'офлайн',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isOnline
                                      ? AppTheme.primary
                                      : Colors.white.withValues(alpha: 0.5),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    PopupMenuButton<String>(
                      icon: Icon(Icons.more_vert,
                          color: Colors.white.withValues(alpha: 0.7)),
                      onSelected: (value) {
                        if (value == 'profile') {
                          provider.setView(AppView.playerProfile);
                        } else if (value == 'delete') {
                          _showDeleteDialog(context);
                        }
                      },
                      itemBuilder: (context) => [
                        const PopupMenuItem(
                          value: 'profile',
                          child: Row(
                            children: [
                              Icon(Icons.person_outline, size: 18),
                              SizedBox(width: 8),
                              Text('Профиль игрока'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_outline,
                                  size: 18, color: AppTheme.destructive),
                              SizedBox(width: 8),
                              Text('Удалить чат',
                                  style: TextStyle(color: AppTheme.destructive)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Messages
              Expanded(
                child: messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('💬', style: TextStyle(fontSize: 48)),
                            const SizedBox(height: 8),
                            Text(
                              'Начни беседу',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.5),
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, index) {
                          final msg = messages[index];
                          final isMe = msg.senderId == provider.user?.id;
                          return _DmBubble(message: msg, isMe: isMe);
                        },
                      ),
              ),

              // Input
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.darkCard,
                  border: Border(
                    top: BorderSide(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _textController,
                          decoration: InputDecoration(
                            hintText: 'Сообщение...',
                            filled: true,
                            fillColor: AppTheme.darkBg,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _sendMessage,
                        icon: const Icon(Icons.send, color: AppTheme.primary),
                        style: IconButton.styleFrom(
                          backgroundColor:
                              AppTheme.primary.withValues(alpha: 0.15),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteDialog(BuildContext context) {
    final provider = context.read<AppProvider>();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.darkCard,
        title: const Text(
          'Удалить чат?',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Все сообщения будут удалены у вас и у собеседника. Это действие нельзя отменить.',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Отмена'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await provider.deleteChat(provider.selectedPlayerId!);
              if (mounted) {
                provider.setView(AppView.privateChats);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.destructive,
            ),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
  }
}

class _DmBubble extends StatelessWidget {
  final dynamic message;
  final bool isMe;

  const _DmBubble({
    required this.message,
    required this.isMe,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.75,
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
              decoration: BoxDecoration(
                color: isMe ? AppTheme.primary : AppTheme.darkCard,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft:
                      isMe ? const Radius.circular(16) : const Radius.circular(4),
                  bottomRight:
                      isMe ? const Radius.circular(4) : const Radius.circular(16),
                ),
              ),
              child: Text(
                message.text,
                style: TextStyle(
                  color: isMe ? AppTheme.darkBg : Colors.white,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
              style: TextStyle(
                fontSize: 10,
                color: Colors.white.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../widgets/app_theme.dart';
import '../widgets/avatar_widget.dart';

class PrivateChatsScreen extends StatefulWidget {
  const PrivateChatsScreen({super.key});

  @override
  State<PrivateChatsScreen> createState() => _PrivateChatsScreenState();
}

class _PrivateChatsScreenState extends State<PrivateChatsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppProvider>().loadContacts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final contacts = provider.contacts;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => provider.setView(AppView.menu),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Личные чаты',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            contacts.isEmpty
                                ? 'Нет диалогов'
                                : '${contacts.length} контактов',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.5),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Contacts
              Expanded(
                child: contacts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.mail_outline,
                              size: 64,
                              color: Colors.white.withValues(alpha: 0.2),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Нет диалогов',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.5),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Чтобы начать личный чат, зайди в раздел\n«Игроки» и нажми «Личный чат»',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.4),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => provider.setView(AppView.players),
                              child: const Text('Перейти к игрокам'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: contacts.length,
                        itemBuilder: (context, index) {
                          final contact = contacts[index];
                          final isOnline =
                              provider.onlineUserIds.contains(contact.userId);
                          return _ContactTile(
                            contact: contact,
                            isOnline: isOnline,
                            onTap: () {
                              provider.setSelectedPlayerId(contact.userId);
                              provider.setView(AppView.privateChat);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  final dynamic contact;
  final bool isOnline;
  final VoidCallback onTap;

  const _ContactTile({
    required this.contact,
    required this.isOnline,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final time = _formatTime(contact.lastMessageAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.darkCard.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
            child: Row(
              children: [
                Stack(
                  children: [
                    AvatarWidget(
                      avatar: contact.avatar,
                      customAvatar: contact.customAvatar,
                      size: 44,
                    ),
                    Positioned(
                      bottom: -1,
                      right: -1,
                      child: Container(
                        width: 12,
                        height: 12,
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
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              contact.username,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            time,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.4),
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              contact.lastMessage,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.5),
                                fontSize: 13,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (contact.unreadCount > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.destructive,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${contact.unreadCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'сейчас';
    if (diff.inMinutes < 60) return '${diff.inMinutes}м';
    if (diff.inHours < 24) return '${diff.inHours}ч';
    if (diff.inDays < 7) return '${diff.inDays}д';
    return '${dt.day}.${dt.month}';
  }
}

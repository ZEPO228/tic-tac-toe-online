import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../config/app_config.dart';
import '../widgets/app_theme.dart';
import '../widgets/avatar_widget.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  Map<String, dynamic>? _stats;
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = context.read<AppProvider>();
    final stats = await provider.loadStats();
    await provider.loadContacts();
    if (mounted) {
      setState(() {
        _stats = stats;
        _unreadCount = provider.contacts.fold(
          0,
          (sum, c) => sum + c.unreadCount,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final user = provider.user;
    if (user == null) return const SizedBox.shrink();

    final avatar = Avatars.getAvatar(user.avatar);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.backgroundGradient,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${provider.onlineCount} онлайн',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout, color: AppTheme.mutedFg),
                      onPressed: () => provider.logout(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Player card
                GestureDetector(
                  onTap: () => provider.setView(AppView.profile),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.darkCard,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    child: Row(
                      children: [
                        AvatarWidget(
                          avatar: user.avatar,
                          customAvatar: user.customAvatar,
                          size: 56,
                          borderRadius: 14,
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.username,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user.avatar == 'custom'
                                    ? 'Своё фото'
                                    : avatar.label,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.6),
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Text(
                                    '${user.gamesPlayed} игр',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.5),
                                      fontSize: 11,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    '${user.gamesWon} побед',
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
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
                const SizedBox(height: 16),

                // Menu items
                _MenuItem(
                  icon: Icons.sports_esports,
                  label: 'Поиск игры',
                  desc: 'Найти соперника или бота',
                  isPrimary: true,
                  onTap: () => provider.startMatchmaking(),
                ),
                const SizedBox(height: 10),
                _MenuItem(
                  icon: Icons.emoji_events,
                  label: 'Игроки',
                  desc: 'Рейтинг и список',
                  onTap: () => provider.setView(AppView.players),
                ),
                const SizedBox(height: 10),
                _MenuItem(
                  icon: Icons.chat_bubble_outline,
                  label: 'Чат',
                  desc: 'Общий онлайн чат',
                  onTap: () => provider.setView(AppView.chat),
                ),
                const SizedBox(height: 10),
                _MenuItem(
                  icon: Icons.mail_outline,
                  label: 'Личные чаты',
                  desc: _unreadCount > 0
                      ? '$_unreadCount непрочитанных'
                      : 'Личные сообщения',
                  badge: _unreadCount > 0 ? _unreadCount : null,
                  onTap: () => provider.setView(AppView.privateChats),
                ),
                const SizedBox(height: 10),
                _MenuItem(
                  icon: Icons.person_outline,
                  label: 'Профиль',
                  desc: 'Статистика и аватар',
                  onTap: () => provider.setView(AppView.profile),
                ),
                const SizedBox(height: 10),
                _MenuItem(
                  icon: Icons.settings_outlined,
                  label: 'Настройки',
                  desc: 'Тема, звук',
                  onTap: () => provider.setView(AppView.settings),
                ),
                const SizedBox(height: 20),

                // Stats footer
                if (_stats != null)
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          value: '${_stats!['totalUsers'] ?? 0}',
                          label: 'игроков',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _StatCard(
                          value: '${_stats!['totalGames'] ?? 0}',
                          label: 'игр всего',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _StatCard(
                          value: '${_stats!['activeGames'] ?? 0}',
                          label: 'активных',
                          isPrimary: true,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String desc;
  final bool isPrimary;
  final int? badge;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.desc,
    this.isPrimary = false,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isPrimary
                ? AppTheme.primary.withValues(alpha: 0.1)
                : AppTheme.darkCard.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPrimary
                  ? AppTheme.primary.withValues(alpha: 0.3)
                  : Colors.white.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isPrimary
                      ? AppTheme.primary
                      : Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isPrimary ? AppTheme.darkBg : Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      desc,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.destructive,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$badge',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              if (isPrimary)
                const Icon(
                  Icons.arrow_forward,
                  color: AppTheme.primary,
                  size: 20,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value;
  final String label;
  final bool isPrimary;

  const _StatCard({
    required this.value,
    required this.label,
    this.isPrimary = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.darkCard.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isPrimary)
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              if (isPrimary) const SizedBox(width: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isPrimary ? AppTheme.primary : Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

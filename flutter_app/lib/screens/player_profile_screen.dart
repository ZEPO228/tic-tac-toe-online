import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../config/app_config.dart';
import '../widgets/app_theme.dart';
import '../widgets/avatar_widget.dart';
import '../models/models.dart';

class PlayerProfileScreen extends StatefulWidget {
  const PlayerProfileScreen({super.key});

  @override
  State<PlayerProfileScreen> createState() => _PlayerProfileScreenState();
}

class _PlayerProfileScreenState extends State<PlayerProfileScreen> {
  User? _player;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPlayer();
  }

  Future<void> _loadPlayer() async {
    final provider = context.read<AppProvider>();
    if (provider.selectedPlayerId == null) {
      provider.setView(AppView.players);
      return;
    }
    final player = await provider.loadPlayerProfile(provider.selectedPlayerId!);
    if (mounted) {
      setState(() {
        _player = player;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final isOnline = provider.onlineUserIds.contains(_player?.id);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: _loading
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary),
                )
              : _player == null
                  ? Center(
                      child: Text(
                        'Игрок не найден',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          // Header
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back, color: Colors.white),
                                onPressed: () => provider.setView(AppView.players),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Профиль игрока',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // Avatar + username
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: AppTheme.darkCard,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: Column(
                              children: [
                                Stack(
                                  children: [
                                    AvatarWidget(
                                      avatar: _player!.avatar,
                                      customAvatar: _player!.customAvatar,
                                      size: 96,
                                      borderRadius: 24,
                                    ),
                                    Positioned(
                                      bottom: 2,
                                      right: 2,
                                      child: Container(
                                        width: 18,
                                        height: 18,
                                        decoration: BoxDecoration(
                                          color: isOnline
                                              ? AppTheme.primary
                                              : Colors.white.withValues(alpha: 0.3),
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: AppTheme.darkCard,
                                            width: 3,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  _player!.username,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      _player!.avatar == 'custom'
                                          ? 'Своё фото'
                                          : Avatars.getAvatar(_player!.avatar).label,
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 13,
                                      ),
                                    ),
                                    const Text(
                                      ' · ',
                                      style: TextStyle(color: Colors.grey),
                                    ),
                                    Text(
                                      isOnline ? 'онлайн' : 'офлайн',
                                      style: TextStyle(
                                        color: isOnline
                                            ? AppTheme.primary
                                            : Colors.white.withValues(alpha: 0.5),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                                if (_player!.createdAt != null) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'С нами с ${DateTime.parse(_player!.createdAt!).toLocal().toString().substring(0, 10)}',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.4),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Stats
                          Row(
                            children: [
                              Expanded(
                                child: _StatCard(
                                  label: 'Победы',
                                  value: _player!.gamesWon,
                                  color: AppTheme.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _StatCard(
                                  label: 'Поражения',
                                  value: _player!.gamesLost,
                                  color: AppTheme.destructive,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _StatCard(
                                  label: 'Ничьи',
                                  value: _player!.gamesDraw,
                                  color: AppTheme.mutedFg,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _StatCard(
                                  label: 'Всего игр',
                                  value: _player!.gamesPlayed,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Win rate
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppTheme.darkCard,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Винрейт',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      '${_player!.winRate.round()}%',
                                      style: const TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: _player!.winRate / 100,
                                    minHeight: 8,
                                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                                    valueColor: const AlwaysStoppedAnimation<Color>(
                                      AppTheme.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Action button
                          ElevatedButton.icon(
                            onPressed: () {
                              provider.setView(AppView.privateChat);
                            },
                            icon: const Icon(Icons.mail_outline),
                            label: const Text('Личный чат'),
                          ),
                        ],
                      ),
                    ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: color, fontSize: 11),
          ),
          const SizedBox(height: 4),
          Text(
            '$value',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

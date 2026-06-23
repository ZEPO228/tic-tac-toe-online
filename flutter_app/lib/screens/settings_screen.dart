import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../services/storage_service.dart';
import '../widgets/app_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late AppSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = context.read<AppProvider>().settings;
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => provider.setView(AppView.menu),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Настройки',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Sound
                _SettingsRow(
                  icon: Icons.volume_up,
                  title: 'Звук',
                  desc: 'Звуковые эффекты в игре',
                  value: _settings.sound,
                  onChanged: (v) {
                    setState(() => _settings = _settings.copyWith(sound: v));
                    provider.updateSettings(_settings);
                  },
                ),
                const SizedBox(height: 8),

                // Vibrate
                _SettingsRow(
                  icon: Icons.vibration,
                  title: 'Вибрация',
                  desc: 'Тактильная отдача на мобильных',
                  value: _settings.vibrate,
                  onChanged: (v) {
                    setState(() => _settings = _settings.copyWith(vibrate: v));
                    provider.updateSettings(_settings);
                  },
                ),
                const SizedBox(height: 8),

                // Auto-queue
                _SettingsRow(
                  icon: Icons.info_outline,
                  title: 'Авто-поиск',
                  desc: 'Сразу искать игру при входе',
                  value: _settings.autoQueue,
                  onChanged: (v) {
                    setState(() => _settings = _settings.copyWith(autoQueue: v));
                    provider.updateSettings(_settings);
                  },
                ),
                const SizedBox(height: 24),

                // About
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.darkCard.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                  child: Column(
                    children: [
                      const Text('⭕❌', style: TextStyle(fontSize: 32)),
                      const SizedBox(height: 8),
                      const Text(
                        'Крестики-Нолики Онлайн',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Версия 1.0.0 · Flutter + Socket.io + Prisma',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Деплой: Railway · GitHub: ZEPO228',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.5),
                          fontSize: 11,
                        ),
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
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SettingsRow({
    required this.icon,
    required this.title,
    required this.desc,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: Colors.white.withValues(alpha: 0.7)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppTheme.primary,
            activeTrackColor: AppTheme.primary.withValues(alpha: 0.3),
          ),
        ],
      ),
    );
  }
}

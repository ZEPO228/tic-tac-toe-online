import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../widgets/app_theme.dart';

class MatchmakingScreen extends StatefulWidget {
  const MatchmakingScreen({super.key});

  @override
  State<MatchmakingScreen> createState() => _MatchmakingScreenState();
}

class _MatchmakingScreenState extends State<MatchmakingScreen> {
  int _elapsed = 0;
  Timer? _timer;
  Timer? _botCheckTimer;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _waitForBot();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _elapsed++;
      });
    });
  }

  void _waitForBot() {
    // Ждём 20 секунд, затем предлагаем бота
    _botCheckTimer?.cancel();
    _botCheckTimer = Timer(const Duration(seconds: 20), () {
      if (mounted) {
        final provider = context.read<AppProvider>();
        provider.playWithBot();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _botCheckTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.backgroundGradient,
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Cancel button
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () {
                    provider.cancelMatchmaking();
                  },
                ),
              ),

              // Content
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Animated search circles
                      SizedBox(
                        width: 220,
                        height: 220,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // Outer pulsing rings
                            for (int i = 0; i < 3; i++)
                              TweenAnimationBuilder<double>(
                                tween: Tween(begin: 0.6, end: 1.0 + i * 0.2),
                                duration: Duration(milliseconds: 1500 + i * 300),
                                builder: (context, value, child) {
                                  return Opacity(
                                    opacity: (1.0 - (value - 0.6) / 0.8)
                                        .clamp(0.0, 1.0),
                                    child: Container(
                                      width: 220 * value,
                                      height: 220 * value,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: AppTheme.primary
                                              .withValues(alpha: 0.3),
                                          width: 2,
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            // Center
                            Container(
                              width: 120,
                              height: 120,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.primary.withValues(alpha: 0.15),
                                border: Border.all(
                                  color: AppTheme.primary.withValues(alpha: 0.4),
                                  width: 2,
                                ),
                              ),
                              child: const Center(
                                child: RotatingIcon(
                                  icon: Icons.search,
                                  color: AppTheme.primary,
                                  size: 48,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Status
                      const Text(
                        'Поиск соперника...',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        provider.queueCount > 1
                            ? '${provider.queueCount} игроков в очереди'
                            : provider.queueCount == 1
                                ? 'Только ты в очереди'
                                : 'Подключение к серверу...',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.6),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Progress bar
                      SizedBox(
                        width: 240,
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Время поиска',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.5),
                                    fontSize: 11,
                                  ),
                                ),
                                Text(
                                  '${_elapsed}с / 20с',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.5),
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: (_elapsed / 20).clamp(0.0, 1.0),
                                minHeight: 6,
                                backgroundColor: Colors.white.withValues(alpha: 0.1),
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                  AppTheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Cancel
                      TextButton(
                        onPressed: () => provider.cancelMatchmaking(),
                        child: Text(
                          'Отмена',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 14,
                          ),
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
}

class RotatingIcon extends StatefulWidget {
  final IconData icon;
  final Color color;
  final double size;

  const RotatingIcon({
    super.key,
    required this.icon,
    required this.color,
    required this.size,
  });

  @override
  State<RotatingIcon> createState() => _RotatingIconState();
}

class _RotatingIconState extends State<RotatingIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _controller,
      child: Icon(widget.icon, color: widget.color, size: widget.size),
    );
  }
}

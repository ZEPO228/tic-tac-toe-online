import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_provider.dart';
import '../config/app_config.dart';
import '../models/models.dart';
import '../widgets/app_theme.dart';
import '../widgets/avatar_widget.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  bool _showResult = false;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final match = provider.currentMatch;
    final gameState = provider.gameState;
    final user = provider.user;

    if (match == null || gameState == null || user == null) {
      return Scaffold(
        body: Container(
          decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
          child: const Center(
            child: CircularProgressIndicator(color: AppTheme.primary),
          ),
        ),
      );
    }

    final isPlayer1 = match.player1.userId == user.id;
    final me = isPlayer1 ? match.player1 : match.player2;
    final opponent = isPlayer1 ? match.player2 : match.player1;
    final mySymbol = me.symbol;
    final opponentSymbol = opponent.symbol;
    final isMyTurn = gameState.currentTurn == mySymbol &&
        gameState.status == 'active';

    // Проверяем конец игры
    String? result;
    if (gameState.status == 'finished' && gameState.winner != null) {
      if (gameState.winner == 'draw') {
        result = 'draw';
      } else if (gameState.winner == mySymbol) {
        result = 'win';
      } else {
        result = 'lose';
      }
    }

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Top bar
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => provider.leaveGame(),
                    ),
                    Expanded(
                      child: Text(
                        match.isVsBot ? 'Игра с ботом' : 'Онлайн игра',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),

              // Opponent card
              _PlayerCard(
                player: opponent,
                symbol: opponentSymbol,
                isActive: !isMyTurn && gameState.status == 'active',
                isBot: match.isVsBot,
              ),
              const SizedBox(height: 16),

              // Board
              Expanded(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.darkCard.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                        ),
                        child: GridView.builder(
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            mainAxisSpacing: 8,
                            crossAxisSpacing: 8,
                          ),
                          itemCount: 9,
                          itemBuilder: (context, index) {
                            return _GameCell(
                              value: gameState.board.length > index
                                  ? gameState.board[index]
                                  : '',
                              isWinning: gameState.winningLine
                                      ?.contains(index) ??
                                  false,
                              canTap: isMyTurn &&
                                  (gameState.board.length > index
                                      ? gameState.board[index].isEmpty
                                      : true) &&
                                  gameState.status == 'active',
                              onTap: () {
                                if (match.isVsBot) {
                                  provider.makeBotMove(index);
                                } else {
                                  provider.makeMove(index);
                                }
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // My card
              _PlayerCard(
                player: me,
                symbol: mySymbol,
                isActive: isMyTurn,
                isMe: true,
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
      // Result modal
      floatingActionButton: result != null && !_showResult
          ? FloatingActionButton(
              onPressed: () {
                setState(() => _showResult = true);
              },
              backgroundColor: AppTheme.primary,
              child: const Icon(Icons.emoji_events, color: AppTheme.darkBg),
            )
          : null,
    );
  }
}

class _PlayerCard extends StatelessWidget {
  final PlayerInfo player;
  final String symbol;
  final bool isActive;
  final bool isMe;
  final bool isBot;

  const _PlayerCard({
    required this.player,
    required this.symbol,
    required this.isActive,
    this.isMe = false,
    this.isBot = false,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: isActive ? 1.0 : 0.5,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.darkCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive
                ? AppTheme.primary.withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            AvatarWidget(
              avatar: player.avatar,
              size: 48,
              borderRadius: 12,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          isMe ? '${player.username} (ты)' : player.username,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isBot) ...[
                        const SizedBox(width: 4),
                        Icon(
                          Icons.smart_toy,
                          size: 14,
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Символ: $symbol',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            if (isActive)
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.primary,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GameCell extends StatelessWidget {
  final String value;
  final bool isWinning;
  final bool canTap;
  final VoidCallback onTap;

  const _GameCell({
    required this.value,
    required this.isWinning,
    required this.canTap,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: canTap ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isWinning
              ? AppTheme.primary.withValues(alpha: 0.3)
              : value.isEmpty
                  ? canTap
                      ? Colors.white.withValues(alpha: 0.05)
                      : Colors.white.withValues(alpha: 0.02)
                  : value == 'X'
                      ? AppTheme.primary.withValues(alpha: 0.1)
                      : AppTheme.accent.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isWinning
                ? AppTheme.primary
                : value == 'X'
                    ? AppTheme.primary.withValues(alpha: 0.2)
                    : value == 'O'
                        ? AppTheme.accent.withValues(alpha: 0.2)
                        : Colors.transparent,
            width: 2,
          ),
        ),
        child: Center(
          child: Text(
            value == 'X' ? '✕' : value == 'O' ? '⭕' : '',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: value == 'X'
                  ? AppTheme.primary
                  : value == 'O'
                      ? AppTheme.accent
                      : Colors.transparent,
            ),
          ),
        ),
      ),
    );
  }
}

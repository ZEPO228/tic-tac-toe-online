import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'state/app_provider.dart';
import 'widgets/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/matchmaking_screen.dart';
import 'screens/game_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/players_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/player_profile_screen.dart';
import 'screens/private_chats_screen.dart';
import 'screens/private_chat_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge отображение — системные панели прозрачные
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );

  // Разрешаем edge-to-edge
  SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.edgeToEdge,
  );

  runApp(const TicTacToeApp());
}

class TicTacToeApp extends StatelessWidget {
  const TicTacToeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppProvider(),
      child: Consumer<AppProvider>(
        builder: (context, provider, _) {
          return MaterialApp(
            title: 'Крестики-Нолики Онлайн',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.darkTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.dark,
            home: const _AppRoot(),
            builder: (context, child) {
              // Обработка lifecycle для авто-реконнекта
              return LifecycleWatcher(
                child: child!,
              );
            },
          );
        },
      ),
    );
  }
}

/// Обработчик lifecycle для авто-реконнекта WebSocket
class LifecycleWatcher extends StatefulWidget {
  final Widget child;

  const LifecycleWatcher({super.key, required this.child});

  @override
  State<LifecycleWatcher> createState() => _LifecycleWatcherState();
}

class _LifecycleWatcherState extends State<LifecycleWatcher>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final provider = context.read<AppProvider>();
    if (state == AppLifecycleState.resumed) {
      provider.onResume();
    } else if (state == AppLifecycleState.paused) {
      provider.onPause();
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

class _AppRoot extends StatelessWidget {
  const _AppRoot();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();

    if (provider.isLoading) {
      return Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: AppTheme.backgroundGradient,
          ),
          child: const Center(
            child: CircularProgressIndicator(
              color: AppTheme.primary,
            ),
          ),
        ),
      );
    }

    // Если пользователь не залогинен — показываем login/register
    if (provider.user == null) {
      switch (provider.view) {
        case AppView.register:
          return const RegisterScreen();
        default:
          return const LoginScreen();
      }
    }

    // Пользователь залогинен — показываем нужный экран
    switch (provider.view) {
      case AppView.matchmaking:
        return const MatchmakingScreen();
      case AppView.game:
        return const GameScreen();
      case AppView.profile:
        return const ProfileScreen();
      case AppView.settings:
        return const SettingsScreen();
      case AppView.players:
        return const PlayersScreen();
      case AppView.chat:
        return const ChatScreen();
      case AppView.playerProfile:
        return const PlayerProfileScreen();
      case AppView.privateChats:
        return const PrivateChatsScreen();
      case AppView.privateChat:
        return const PrivateChatScreen();
      default:
        return const MenuScreen();
    }
  }
}

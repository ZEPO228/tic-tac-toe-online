import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../services/storage_service.dart';
import '../services/haptic_service.dart';

/// Состояние навигации
enum AppView {
  login,
  register,
  menu,
  matchmaking,
  game,
  profile,
  settings,
  players,
  chat,
  playerProfile,
  privateChats,
  privateChat,
}

/// Главное состояние приложения
class AppProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socket = SocketService();
  final StorageService _storage = StorageService();
  final HapticService _haptic = HapticService();

  // === State ===
  User? _user;
  User? _cachedUser;
  AppView _view = AppView.login;
  bool _isLoading = true;
  bool _isConnected = false;
  int _onlineCount = 0;
  Set<String> _onlineUserIds = {};
  int _queueCount = 0;
  String? _selectedPlayerId;
  String? _errorMessage;
  String? _successMessage;

  // Game state
  MatchData? _currentMatch;
  GameState? _gameState;
  bool _botAvailable = false;

  // Chat state
  List<ChatMessage> _messages = [];
  List<DirectMessage> _directMessages = [];
  List<Contact> _contacts = [];

  // Settings
  AppSettings _settings = AppSettings.defaults();

  // Stream subscriptions
  final List<StreamSubscription> _subscriptions = [];

  // === Getters ===
  User? get user => _user;
  User? get cachedUser => _cachedUser;
  AppView get view => _view;
  bool get isLoading => _isLoading;
  bool get isConnected => _isConnected;
  int get onlineCount => _onlineCount;
  Set<String> get onlineUserIds => _onlineUserIds;
  int get queueCount => _queueCount;
  String? get selectedPlayerId => _selectedPlayerId;
  String? get errorMessage => _errorMessage;
  String? get successMessage => _successMessage;
  MatchData? get currentMatch => _currentMatch;
  GameState? get gameState => _gameState;
  bool get botAvailable => _botAvailable;
  List<ChatMessage> get messages => _messages;
  List<DirectMessage> get directMessages => _directMessages;
  List<Contact> get contacts => _contacts;
  AppSettings get settings => _settings;

  AppProvider() {
    _init();
  }

  Future<void> _init() async {
    await _storage.init();
    _haptic.init();
    _settings = _storage.getSettings();

    // Загружаем кэшированного пользователя для моментального запуска
    _cachedUser = _storage.getCachedUser();

    // Восстанавливаем токен
    final token = _storage.getToken();
    if (token != null) {
      _api.setToken(token);
      // Проверяем валидность токена
      final me = await _api.getMe();
      if (me != null) {
        _user = me;
        await _storage.cacheUser(me);
        _cachedUser = me;
        _view = AppView.menu;
        _setupSocket();
      } else {
        // Токен невалиден
        await _storage.removeToken();
        await _storage.clearCachedUser();
        _cachedUser = null;
        _view = AppView.login;
      }
    } else if (_cachedUser != null) {
      // Есть кэш, но нет токена — показываем login
      _view = AppView.login;
    } else {
      _view = AppView.login;
    }

    _setupSocketListeners();
    _isLoading = false;
    notifyListeners();
  }

  void _setupSocket() {
    _socket.connect();
  }

  void _setupSocketListeners() {
    _subscriptions.add(_socket.onConnectChange.listen((connected) {
      _isConnected = connected;
      notifyListeners();
    }));

    _subscriptions.add(_socket.onOnlineCount.listen((count) {
      _onlineCount = count;
      notifyListeners();
    }));

    _subscriptions.add(_socket.onOnlineUsers.listen((userIds) {
      _onlineUserIds = userIds.toSet();
      notifyListeners();
    }));

    _subscriptions.add(_socket.onQueueCount.listen((count) {
      _queueCount = count;
      notifyListeners();
    }));

    _subscriptions.add(_socket.onMatchFound.listen((data) {
      if (data.containsKey('bot_available')) {
        _botAvailable = true;
        notifyListeners();
      } else {
        _currentMatch = MatchData.fromJson(data);
        _gameState = GameState(
          gameId: _currentMatch!.gameId,
          board: _currentMatch!.board,
          currentTurn: _currentMatch!.currentTurn,
          status: 'active',
          winner: null,
          winningLine: null,
        );
        _botAvailable = false;
        _view = AppView.game;
        notifyListeners();
      }
    }));

    _subscriptions.add(_socket.onGameState.listen((data) {
      _gameState = GameState.fromJson(data);
      if (_gameState!.status == 'finished') {
        _haptic.move();
      }
      notifyListeners();
    }));

    _subscriptions.add(_socket.onGameEnd.listen((_) {
      // Обработка через game_state
    }));

    _subscriptions.add(_socket.onChatMessage.listen((data) {
      _messages.add(ChatMessage.fromJson(data));
      if (_messages.length > 50) {
        _messages = _messages.sublist(_messages.length - 50);
      }
      notifyListeners();
    }));

    _subscriptions.add(_socket.onChatHistory.listen((messages) {
      _messages = messages.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)).toList();
      notifyListeners();
    }));

    _subscriptions.add(_socket.onDmMessage.listen((data) {
      final msg = DirectMessage.fromJson(data);
      // Добавляем только если этот диалог открыт
      _directMessages.add(msg);
      notifyListeners();
    }));
  }

  // === Navigation ===

  void setView(AppView view) {
    _view = view;
    _errorMessage = null;
    notifyListeners();
  }

  void setSelectedPlayerId(String? id) {
    _selectedPlayerId = id;
    notifyListeners();
  }

  // === Auth ===

  Future<bool> login(String username, String password) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final user = await _api.login(username: username, password: password);
      _user = user;

      final token = _api.token;
      if (token != null) {
        await _storage.saveToken(token);
      }
      await _storage.cacheUser(user);
      _cachedUser = user;

      _view = AppView.menu;
      _setupSocket();
      _haptic.success();
      _successMessage = 'С возвращением, ${user.username}!';
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _haptic.error();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> register(String username, String password, String avatar) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final user = await _api.register(
        username: username,
        password: password,
        avatar: avatar,
      );
      _user = user;

      final token = _api.token;
      if (token != null) {
        await _storage.saveToken(token);
      }
      await _storage.cacheUser(user);
      _cachedUser = user;

      _view = AppView.menu;
      _setupSocket();
      _haptic.success();
      _successMessage = 'Добро пожаловать, ${user.username}!';
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      _haptic.error();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _api.logout();
    await _storage.removeToken();
    await _storage.clearCachedUser();
    _socket.disconnect();
    _user = null;
    _cachedUser = null;
    _view = AppView.login;
    _messages = [];
    _directMessages = [];
    _contacts = [];
    _currentMatch = null;
    _gameState = null;
    notifyListeners();
  }

  // === Profile ===

  Future<void> refreshProfile() async {
    if (_user == null) return;
    try {
      final profile = await _api.getProfile();
      _user = profile;
      await _storage.cacheUser(profile);
      _cachedUser = profile;
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> updateAvatar(String avatar) async {
    try {
      final user = await _api.updateAvatar(avatar);
      _user = user;
      await _storage.cacheUser(user);
      _cachedUser = user;
      _successMessage = 'Аватарка обновлена!';
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> uploadAvatar(String base64Image) async {
    try {
      final user = await _api.uploadAvatar(base64Image);
      _user = user;
      await _storage.cacheUser(user);
      _cachedUser = user;
      _successMessage = 'Аватарка обновлена!';
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  // === Matchmaking ===

  void startMatchmaking() {
    _botAvailable = false;
    _socket.queueJoin();
    _view = AppView.matchmaking;
    notifyListeners();
  }

  void cancelMatchmaking() {
    _socket.queueLeave();
    _view = AppView.menu;
    notifyListeners();
  }

  void playWithBot() {
    _socket.playWithBot();
  }

  // === Game (bot via HTTP API) ===

  Future<void> createBotGame() async {
    try {
      final data = await _api.createBotGame();
      _currentMatch = MatchData(
        gameId: data['gameId'],
        player1: PlayerInfo(
          userId: _user?.id ?? '',
          username: _user?.username ?? 'Ты',
          avatar: _user?.avatar ?? 'avatar-1',
          symbol: 'X',
        ),
        player2: PlayerInfo(
          userId: 'bot',
          username: 'Бот',
          avatar: 'avatar-16',
          symbol: 'O',
        ),
        isVsBot: true,
        board: List<String>.from(data['board']),
        currentTurn: data['currentTurn'] ?? 'X',
      );
      _gameState = GameState(
        gameId: data['gameId'],
        board: List<String>.from(data['board']),
        currentTurn: data['currentTurn'] ?? 'X',
        status: 'active',
        winner: null,
        winningLine: null,
      );
      _view = AppView.game;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  Future<void> makeBotMove(int index) async {
    if (_gameState == null || _currentMatch == null) return;
    if (_gameState!.board[index] != '') return;
    if (_gameState!.currentTurn != 'X') return; // Только ход игрока

    try {
      _haptic.move();
      final newState = await _api.botMove(_gameState!.gameId, index);
      _gameState = newState;

      if (newState.status == 'finished') {
        if (newState.winner == 'X') {
          _haptic.win();
        } else if (newState.winner == 'O') {
          _haptic.lose();
        } else {
          _haptic.draw();
        }
        await refreshProfile();
      }

      notifyListeners();
    } catch (e) {
      _haptic.error();
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  // === Game (multiplayer via Socket) ===

  void makeMove(int index) {
    if (_gameState == null || _currentMatch == null) return;
    if (_gameState!.board[index] != '') return;
    if (_gameState!.status != 'active') return;

    final mySymbol = _currentMatch!.player1.userId == _user?.id ? 'X' : 'O';
    if (_gameState!.currentTurn != mySymbol) return;

    _haptic.move();
    _socket.gameMove(_gameState!.gameId, index);
  }

  void leaveGame() {
    if (_currentMatch != null && !_currentMatch!.isVsBot) {
      _socket.gameLeave(_currentMatch!.gameId);
    }
    _currentMatch = null;
    _gameState = null;
    _view = AppView.menu;
    notifyListeners();
  }

  void playAgain() {
    _currentMatch = null;
    _gameState = null;
    _view = AppView.matchmaking;
    _botAvailable = false;
    notifyListeners();
  }

  // === Chat ===

  void sendChatMessage(String text) {
    if (text.trim().isEmpty) return;
    _socket.sendChatMessage(text.trim());
  }

  void requestChatHistory() {
    _socket.requestChatHistory();
  }

  // === Direct Messages ===

  Future<void> loadContacts() async {
    try {
      _contacts = await _api.getContacts();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadDirectMessages(String userId) async {
    try {
      _directMessages = await _api.getDirectMessages(userId);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> sendDirectMessage(String recipientId, String text) async {
    if (text.trim().isEmpty) return;
    try {
      final msg = await _api.sendDirectMessage(
        recipientId: recipientId,
        text: text.trim(),
      );
      _directMessages.add(msg);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  Future<void> deleteChat(String otherUserId) async {
    try {
      await _api.deleteChat(otherUserId);
      _successMessage = 'Чат удалён';
      _directMessages = [];
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }

  // === Players ===

  Future<List<User>> loadPlayers() async {
    try {
      return await _api.getPlayers();
    } catch (_) {
      return [];
    }
  }

  Future<User?> loadPlayerProfile(String playerId) async {
    try {
      return await _api.getPlayerProfile(playerId);
    } catch (_) {
      return null;
    }
  }

  // === Stats ===

  Future<Map<String, dynamic>> loadStats() async {
    try {
      return await _api.getStats();
    } catch (_) {
      return {'totalUsers': 0, 'totalGames': 0, 'activeGames': 0};
    }
  }

  // === Settings ===

  Future<void> updateSettings(AppSettings settings) async {
    _settings = settings;
    await _storage.saveSettings(settings);
    _haptic.setEnabled(settings.vibrate);
    notifyListeners();
  }

  // === Messages ===

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearSuccess() {
    _successMessage = null;
    notifyListeners();
  }

  // === Lifecycle ===

  /// Вызывается когда приложение возвращается из background
  void onResume() {
    if (_user != null && !_socket.isConnected) {
      _socket.forceReconnect();
    }
  }

  /// Вызывается когда приложение сворачивается
  void onPause() {
    // Сокет остаётся подключённым для получения уведомлений
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _socket.dispose();
    super.dispose();
  }
}

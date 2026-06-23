import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/app_config.dart';
import '../services/api_service.dart';

/// WebSocket сервис с авто-реконнектом
class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  bool _isConnecting = false;
  int _reconnectAttempts = 0;
  Timer? _reconnectTimer;
  String? _token;

  // Stream controllers for events
  final _connectController = StreamController<bool>.broadcast();
  final _onlineCountController = StreamController<int>.broadcast();
  final _onlineUsersController = StreamController<List<String>>.broadcast();
  final _queueCountController = StreamController<int>.broadcast();
  final _matchFoundController = StreamController<Map<String, dynamic>>.broadcast();
  final _gameStateController = StreamController<Map<String, dynamic>>.broadcast();
  final _gameEndController = StreamController<Map<String, dynamic>>.broadcast();
  final _chatMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _chatHistoryController = StreamController<List<dynamic>>.broadcast();
  final _dmMessageController = StreamController<Map<String, dynamic>>.broadcast();

  // Streams
  Stream<bool> get onConnectChange => _connectController.stream;
  Stream<int> get onOnlineCount => _onlineCountController.stream;
  Stream<List<String>> get onOnlineUsers => _onlineUsersController.stream;
  Stream<int> get onQueueCount => _queueCountController.stream;
  Stream<Map<String, dynamic>> get onMatchFound => _matchFoundController.stream;
  Stream<Map<String, dynamic>> get onGameState => _gameStateController.stream;
  Stream<Map<String, dynamic>> get onGameEnd => _gameEndController.stream;
  Stream<Map<String, dynamic>> get onChatMessage => _chatMessageController.stream;
  Stream<List<dynamic>> get onChatHistory => _chatHistoryController.stream;
  Stream<Map<String, dynamic>> get onDmMessage => _dmMessageController.stream;

  bool get isConnected => _isConnected;

  /// Инициализация сокета
  Future<void> connect() async {
    if (_isConnecting || _isConnected) return;
    _isConnecting = true;

    try {
      // Получаем socket-token с сервера
      final token = await ApiService().getSocketToken();
      _token = token;

      _socket?.dispose();
      _socket = IO.io(
        AppConfig.socketUrl,
        IO.OptionBuilder()
          .setTransports(['polling'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(AppConfig.maxReconnectAttempts)
          .setReconnectionDelay(AppConfig.reconnectDelay.inMilliseconds)
          .setAuth({'token': _token})
          .build(),
      );

      _setupListeners();

      _socket!.connect();
    } catch (e) {
      debugPrint('Socket connect error: $e');
      _scheduleReconnect();
    } finally {
      _isConnecting = false;
    }
  }

  void _setupListeners() {
    _socket!.onConnect((_) {
      _isConnected = true;
      _reconnectAttempts = 0;
      _connectController.add(true);
      debugPrint('✅ Socket connected');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      _connectController.add(false);
      debugPrint('⚠️ Socket disconnected');
      _scheduleReconnect();
    });

    _socket!.onConnectError((err) {
      _isConnected = false;
      debugPrint('❌ Socket connect error: $err');
      _scheduleReconnect();
    });

    _socket!.on('online_count', (data) {
      if (data is Map) {
        _onlineCountController.add(data['count'] as int? ?? 0);
      }
    });

    _socket!.on('online_users', (data) {
      if (data is Map) {
        final userIds = (data['userIds'] as List? ?? [])
            .map((e) => e.toString())
            .toList();
        _onlineUsersController.add(userIds);
      }
    });

    _socket!.on('queue_count', (data) {
      if (data is Map) {
        _queueCountController.add(data['count'] as int? ?? 0);
      }
    });

    _socket!.on('match_found', (data) {
      _matchFoundController.add(Map<String, dynamic>.from(data as Map));
    });

    _socket!.on('game_state', (data) {
      _gameStateController.add(Map<String, dynamic>.from(data as Map));
    });

    _socket!.on('game_end', (data) {
      _gameEndController.add(Map<String, dynamic>.from(data as Map));
    });

    _socket!.on('chat_message', (data) {
      _chatMessageController.add(Map<String, dynamic>.from(data as Map));
    });

    _socket!.on('chat_history', (data) {
      if (data is Map) {
        _chatHistoryController.add(data['messages'] as List? ?? []);
      }
    });

    _socket!.on('dm_message', (data) {
      _dmMessageController.add(Map<String, dynamic>.from(data as Map));
    });

    _socket!.on('bot_available', (_) {
      // Сервер сообщает что можно играть с ботом
      _matchFoundController.add({'bot_available': true});
    });
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    if (_reconnectAttempts >= AppConfig.maxReconnectAttempts) {
      debugPrint('Max reconnect attempts reached');
      return;
    }

    _reconnectAttempts++;
    final delay = AppConfig.reconnectDelay * _reconnectAttempts;
    debugPrint('Reconnecting in ${delay.inSeconds}s (attempt $_reconnectAttempts)');

    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  /// Принудительный реконнект (например, при resume из background)
  Future<void> forceReconnect() async {
    _reconnectAttempts = 0;
    _reconnectTimer?.cancel();
    _socket?.dispose();
    _isConnected = false;
    await connect();
  }

  // === Emit методы ===

  void queueJoin() {
    _socket?.emit('queue_join');
  }

  void queueLeave() {
    _socket?.emit('queue_leave');
  }

  void playWithBot() {
    _socket?.emit('play_with_bot');
  }

  void gameMove(String gameId, int index) {
    _socket?.emit('game_move', {'gameId': gameId, 'index': index});
  }

  void gameLeave(String gameId) {
    _socket?.emit('game_leave', {'gameId': gameId});
  }

  void sendChatMessage(String text) {
    _socket?.emit('chat_message', {'text': text});
  }

  void requestChatHistory() {
    _socket?.emit('chat_history');
  }

  void sendDirectMessage(String recipientId, String text) {
    _socket?.emit('dm_send', {'recipientId': recipientId, 'text': text});
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
  }

  void dispose() {
    disconnect();
    _connectController.close();
    _onlineCountController.close();
    _onlineUsersController.close();
    _queueCountController.close();
    _matchFoundController.close();
    _gameStateController.close();
    _gameEndController.close();
    _chatMessageController.close();
    _chatHistoryController.close();
    _dmMessageController.close();
  }
}

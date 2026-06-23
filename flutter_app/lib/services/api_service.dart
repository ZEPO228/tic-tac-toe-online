import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/models.dart';

/// REST API клиент для общения с сервером на Railway
class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;

  String? get token => _token;

  void setToken(String? token) {
    _token = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Cookie': '${AppConfig.tokenKey}=$_token',
  };

  /// Регистрация
  Future<User> register({
    required String username,
    required String password,
    String avatar = 'avatar-1',
  }) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'username': username,
        'password': password,
        'avatar': avatar,
      }),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка регистрации');
    }

    // Извлекаем токен из Set-Cookie
    _extractToken(res);

    return User.fromJson(data['user']);
  }

  /// Вход
  Future<User> login({
    required String username,
    required String password,
  }) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'username': username,
        'password': password,
      }),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка входа');
    }

    _extractToken(res);

    return User.fromJson(data['user']);
  }

  /// Выход
  Future<void> logout() async {
    try {
      await http.post(
        Uri.parse('${AppConfig.apiUrl}/auth/logout'),
        headers: _headers,
      ).timeout(AppConfig.requestTimeout);
    } catch (_) {
      // Ignore errors on logout
    }
    _token = null;
  }

  /// Получить текущего пользователя
  Future<User?> getMe() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConfig.apiUrl}/auth/me'),
        headers: _headers,
      ).timeout(AppConfig.requestTimeout);

      if (res.statusCode != 200) return null;

      final data = jsonDecode(res.body);
      if (data['user'] == null) return null;

      return User.fromJson(data['user']);
    } catch (_) {
      return null;
    }
  }

  /// Получить свой профиль со статистикой
  Future<User> getProfile() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/profile'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка получения профиля');
    }

    return User.fromJson(data['user']);
  }

  /// Обновить аватар (preset)
  Future<User> updateAvatar(String avatar) async {
    final res = await http.patch(
      Uri.parse('${AppConfig.apiUrl}/profile'),
      headers: _headers,
      body: jsonEncode({'avatar': avatar}),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка обновления аватара');
    }

    return User.fromJson(data['user']);
  }

  /// Загрузить кастомный аватар (base64)
  Future<User> uploadAvatar(String base64Image) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/avatar/upload'),
      headers: _headers,
      body: jsonEncode({'image': base64Image}),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка загрузки аватара');
    }

    return User.fromJson(data['user']);
  }

  /// Получить список игроков (топ-50)
  Future<List<User>> getPlayers() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/players'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    if (res.statusCode != 200) return [];

    final data = jsonDecode(res.body);
    final players = data['players'] as List? ?? [];
    return players.map((p) => User.fromJson(p)).toList();
  }

  /// Получить профиль конкретного игрока
  Future<User> getPlayerProfile(String playerId) async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/players/$playerId'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Игрок не найден');
    }

    return User.fromJson(data['player']);
  }

  /// Получить статистику
  Future<Map<String, dynamic>> getStats() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/stats'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    if (res.statusCode != 200) {
      return {'totalUsers': 0, 'totalGames': 0, 'activeGames': 0};
    }

    return jsonDecode(res.body);
  }

  /// Получить socket-token (короткоживущий для WebSocket auth)
  Future<String?> getSocketToken() async {
    try {
      final res = await http.get(
        Uri.parse('${AppConfig.apiUrl}/auth/socket-token'),
        headers: _headers,
      ).timeout(AppConfig.requestTimeout);

      if (res.statusCode != 200) return null;

      final data = jsonDecode(res.body);
      return data['token'];
    } catch (_) {
      return null;
    }
  }

  /// Создать игру с ботом
  Future<Map<String, dynamic>> createBotGame() async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/game/bot-move'),
      headers: _headers,
      body: jsonEncode({'action': 'create'}),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка создания игры');
    }

    return data;
  }

  /// Сделать ход в игре с ботом
  Future<GameState> botMove(String gameId, int index) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/game/bot-move'),
      headers: _headers,
      body: jsonEncode({
        'action': 'move',
        'gameId': gameId,
        'index': index,
      }),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка хода');
    }

    return GameState.fromJson(data);
  }

  /// Отправить личное сообщение
  Future<DirectMessage> sendDirectMessage({
    required String recipientId,
    required String text,
  }) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/direct-messages/send'),
      headers: _headers,
      body: jsonEncode({
        'recipientId': recipientId,
        'text': text,
      }),
    ).timeout(AppConfig.requestTimeout);

    final data = jsonDecode(res.body);
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Ошибка отправки');
    }

    return DirectMessage.fromJson(data['message']);
  }

  /// Получить историю переписки
  Future<List<DirectMessage>> getDirectMessages(String userId) async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/direct-messages/$userId'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    if (res.statusCode != 200) return [];

    final data = jsonDecode(res.body);
    final messages = data['messages'] as List? ?? [];
    return messages.map((m) => DirectMessage.fromJson(m)).toList();
  }

  /// Получить список контактов
  Future<List<Contact>> getContacts() async {
    final res = await http.get(
      Uri.parse('${AppConfig.apiUrl}/direct-messages/contacts'),
      headers: _headers,
    ).timeout(AppConfig.requestTimeout);

    if (res.statusCode != 200) return [];

    final data = jsonDecode(res.body);
    final contacts = data['contacts'] as List? ?? [];
    return contacts.map((c) => Contact.fromJson(c)).toList();
  }

  /// Удалить чат
  Future<void> deleteChat(String otherUserId) async {
    await http.post(
      Uri.parse('${AppConfig.apiUrl}/direct-messages/delete'),
      headers: _headers,
      body: jsonEncode({'otherUserId': otherUserId}),
    ).timeout(AppConfig.requestTimeout);
  }

  /// Извлечь токен из Set-Cookie заголовка
  void _extractToken(http.Response res) {
    final setCookie = res.headers['set-cookie'];
    if (setCookie != null) {
      // Ищем ttt_token=... в Set-Cookie
      final match = RegExp(r'ttt_token=([^;]+)').firstMatch(setCookie);
      if (match != null) {
        _token = match.group(1);
      }
    }
  }
}

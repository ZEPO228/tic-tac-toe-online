import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/models.dart';

/// Локальное кэширование профиля и настроек
class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('StorageService not initialized. Call init() first.');
    }
    return _prefs!;
  }

  // === Auth Token ===

  Future<void> saveToken(String token) async {
    await prefs.setString(AppConfig.tokenKey, token);
  }

  String? getToken() {
    return prefs.getString(AppConfig.tokenKey);
  }

  Future<void> removeToken() async {
    await prefs.remove(AppConfig.tokenKey);
  }

  // === User Cache ===

  Future<void> cacheUser(User user) async {
    await prefs.setString(AppConfig.userCacheKey, jsonEncode(user.toJson()));
  }

  User? getCachedUser() {
    final json = prefs.getString(AppConfig.userCacheKey);
    if (json == null) return null;
    try {
      return User.fromJson(jsonDecode(json));
    } catch (_) {
      return null;
    }
  }

  Future<void> clearCachedUser() async {
    await prefs.remove(AppConfig.userCacheKey);
  }

  // === Settings ===

  Future<void> saveSettings(AppSettings settings) async {
    await prefs.setString(AppConfig.settingsKey, jsonEncode(settings.toJson()));
  }

  AppSettings getSettings() {
    final json = prefs.getString(AppConfig.settingsKey);
    if (json == null) return AppSettings.defaults();
    try {
      return AppSettings.fromJson(jsonDecode(json));
    } catch (_) {
      return AppSettings.defaults();
    }
  }

  // === Theme ===

  Future<void> saveTheme(String theme) async {
    await prefs.setString('theme', theme);
  }

  String getTheme() {
    return prefs.getString('theme') ?? 'dark';
  }
}

/// Настройки приложения
class AppSettings {
  final bool sound;
  final bool vibrate;
  final bool autoQueue;

  AppSettings({
    required this.sound,
    required this.vibrate,
    required this.autoQueue,
  });

  factory AppSettings.defaults() => AppSettings(
    sound: true,
    vibrate: true,
    autoQueue: false,
  );

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      sound: json['sound'] ?? true,
      vibrate: json['vibrate'] ?? true,
      autoQueue: json['autoQueue'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'sound': sound,
    'vibrate': vibrate,
    'autoQueue': autoQueue,
  };

  AppSettings copyWith({
    bool? sound,
    bool? vibrate,
    bool? autoQueue,
  }) {
    return AppSettings(
      sound: sound ?? this.sound,
      vibrate: vibrate ?? this.vibrate,
      autoQueue: autoQueue ?? this.autoQueue,
    );
  }
}

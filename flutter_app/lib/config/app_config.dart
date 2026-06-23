/// Конфигурация приложения — URL сервера, таймауты, константы
class AppConfig {
  // Production server URL (Railway)
  static const String serverUrl = 'https://web-production-1a709.up.railway.app';

  // WebSocket URL (same host, Socket.io with polling transport)
  static const String socketUrl = 'https://web-production-1a709.up.railway.app';

  // API base URL
  static const String apiUrl = '$serverUrl/api';

  // Request timeout
  static const Duration requestTimeout = Duration(seconds: 15);

  // Socket reconnect settings
  static const Duration reconnectDelay = Duration(seconds: 2);
  static const int maxReconnectAttempts = 50;

  // Local storage keys
  static const String tokenKey = 'auth_token';
  static const String socketTokenKey = 'socket_token';
  static const String userCacheKey = 'cached_user';
  static const String settingsKey = 'app_settings';

  // App info
  static const String appVersion = '1.0.0';
  static const String appName = 'Крестики-Нолики Онлайн';
}

/// Аватары (24 пресета) — синхронизировано с веб-версией
class AvatarDef {
  final String id;
  final String label;
  final String emoji;
  final int color;

  const AvatarDef({
    required this.id,
    required this.label,
    required this.emoji,
    required this.color,
  });
}

class Avatars {
  static const List<AvatarDef> presets = [
    AvatarDef(id: 'avatar-1', label: 'Кот', emoji: '🐱', color: 0xFFF59E0B),
    AvatarDef(id: 'avatar-2', label: 'Собака', emoji: '🐶', color: 0xFF3B82F6),
    AvatarDef(id: 'avatar-3', label: 'Лис', emoji: '🦊', color: 0xFFEF4444),
    AvatarDef(id: 'avatar-4', label: 'Панда', emoji: '🐼', color: 0xFF10B981),
    AvatarDef(id: 'avatar-5', label: 'Сова', emoji: '🦉', color: 0xFF8B5CF6),
    AvatarDef(id: 'avatar-6', label: 'Лев', emoji: '🦁', color: 0xFFF97316),
    AvatarDef(id: 'avatar-7', label: 'Тигр', emoji: '🐯', color: 0xFFFBBF24),
    AvatarDef(id: 'avatar-8', label: 'Волк', emoji: '🐺', color: 0xFF6B7280),
    AvatarDef(id: 'avatar-9', label: 'Медведь', emoji: '🐻', color: 0xFFA16207),
    AvatarDef(id: 'avatar-10', label: 'Кролик', emoji: '🐰', color: 0xFFEC4899),
    AvatarDef(id: 'avatar-11', label: 'Лягушка', emoji: '🐸', color: 0xFF22C55E),
    AvatarDef(id: 'avatar-12', label: 'Пингвин', emoji: '🐧', color: 0xFF0EA5E9),
    AvatarDef(id: 'avatar-13', label: 'Единорог', emoji: '🦄', color: 0xFFD946EF),
    AvatarDef(id: 'avatar-14', label: 'Дракон', emoji: '🐉', color: 0xFF16A34A),
    AvatarDef(id: 'avatar-15', label: 'Призрак', emoji: '👻', color: 0xFF94A3B8),
    AvatarDef(id: 'avatar-16', label: 'Робот', emoji: '🤖', color: 0xFF475569),
    AvatarDef(id: 'avatar-17', label: 'Алмаз', emoji: '💎', color: 0xFF06B6D4),
    AvatarDef(id: 'avatar-18', label: 'Огонь', emoji: '🔥', color: 0xFFDC2626),
    AvatarDef(id: 'avatar-19', label: 'Молния', emoji: '⚡', color: 0xFFEAB308),
    AvatarDef(id: 'avatar-20', label: 'Звезда', emoji: '⭐', color: 0xFFF59E0B),
    AvatarDef(id: 'avatar-21', label: 'Ракета', emoji: '🚀', color: 0xFF7C3AED),
    AvatarDef(id: 'avatar-22', label: 'Краб', emoji: '🦀', color: 0xFFEF4444),
    AvatarDef(id: 'avatar-23', label: 'Осьминог', emoji: '🐙', color: 0xFFBE185D),
    AvatarDef(id: 'avatar-24', label: 'Бабочка', emoji: '🦋', color: 0xFFA855F7),
  ];

  static AvatarDef getAvatar(String id) {
    return presets.firstWhere(
      (a) => a.id == id,
      orElse: () => presets[0],
    );
  }
}

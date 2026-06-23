/// Модель пользователя
class User {
  final String id;
  final String username;
  final String avatar;
  final String? customAvatar;
  final String? role;
  final int gamesPlayed;
  final int gamesWon;
  final int gamesLost;
  final int gamesDraw;
  final String? createdAt;
  final bool? isAdmin;

  User({
    required this.id,
    required this.username,
    required this.avatar,
    this.customAvatar,
    this.role,
    required this.gamesPlayed,
    required this.gamesWon,
    required this.gamesLost,
    required this.gamesDraw,
    this.createdAt,
    this.isAdmin,
  });

  double get winRate {
    if (gamesPlayed == 0) return 0;
    return (gamesWon / gamesPlayed) * 100;
  }

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      avatar: json['avatar'] ?? 'avatar-1',
      customAvatar: json['customAvatar'],
      role: json['role'],
      gamesPlayed: json['gamesPlayed'] ?? 0,
      gamesWon: json['gamesWon'] ?? 0,
      gamesLost: json['gamesLost'] ?? 0,
      gamesDraw: json['gamesDraw'] ?? 0,
      createdAt: json['createdAt'],
      isAdmin: json['isAdmin'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'avatar': avatar,
      'customAvatar': customAvatar,
      'role': role,
      'gamesPlayed': gamesPlayed,
      'gamesWon': gamesWon,
      'gamesLost': gamesLost,
      'gamesDraw': gamesDraw,
      'createdAt': createdAt,
      'isAdmin': isAdmin,
    };
  }
}

/// Модель сообщения (глобальный чат)
class ChatMessage {
  final String id;
  final String? userId;
  final String username;
  final String avatar;
  final String text;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    this.userId,
    required this.username,
    required this.avatar,
    required this.text,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      userId: json['userId'],
      username: json['username'] ?? '',
      avatar: json['avatar'] ?? 'avatar-1',
      text: json['text'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt']).toLocal()
          : DateTime.now(),
    );
  }
}

/// Модель личного сообщения
class DirectMessage {
  final String id;
  final String senderId;
  final String recipientId;
  final String text;
  final bool read;
  final DateTime createdAt;

  DirectMessage({
    required this.id,
    required this.senderId,
    required this.recipientId,
    required this.text,
    required this.read,
    required this.createdAt,
  });

  factory DirectMessage.fromJson(Map<String, dynamic> json) {
    return DirectMessage(
      id: json['id'] ?? '',
      senderId: json['senderId'] ?? '',
      recipientId: json['recipientId'] ?? '',
      text: json['text'] ?? '',
      read: json['read'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt']).toLocal()
          : DateTime.now(),
    );
  }
}

/// Контакт в списке личных чатов
class Contact {
  final String userId;
  final String username;
  final String avatar;
  final String? customAvatar;
  final String lastMessage;
  final DateTime lastMessageAt;
  final int unreadCount;

  Contact({
    required this.userId,
    required this.username,
    required this.avatar,
    this.customAvatar,
    required this.lastMessage,
    required this.lastMessageAt,
    required this.unreadCount,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      userId: json['userId'] ?? '',
      username: json['username'] ?? '',
      avatar: json['avatar'] ?? 'avatar-1',
      customAvatar: json['customAvatar'],
      lastMessage: json['lastMessage'] ?? '',
      lastMessageAt: json['lastMessageAt'] != null
          ? DateTime.parse(json['lastMessageAt']).toLocal()
          : DateTime.now(),
      unreadCount: json['unreadCount'] ?? 0,
    );
  }
}

/// Состояние игры
class GameState {
  final String gameId;
  final List<String> board;
  final String currentTurn;
  final String status;
  final String? winner;
  final List<int>? winningLine;
  final bool? forfeit;

  GameState({
    required this.gameId,
    required this.board,
    required this.currentTurn,
    required this.status,
    this.winner,
    this.winningLine,
    this.forfeit,
  });

  factory GameState.fromJson(Map<String, dynamic> json) {
    return GameState(
      gameId: json['gameId'] ?? '',
      board: List<String>.from(json['board'] ?? []),
      currentTurn: json['currentTurn'] ?? 'X',
      status: json['status'] ?? 'active',
      winner: json['winner'],
      winningLine: json['winningLine'] != null
          ? List<int>.from(json['winningLine'])
          : null,
      forfeit: json['forfeit'],
    );
  }
}

/// Данные о матче
class MatchData {
  final String gameId;
  final PlayerInfo player1;
  final PlayerInfo player2;
  final bool isVsBot;
  final List<String> board;
  final String currentTurn;

  MatchData({
    required this.gameId,
    required this.player1,
    required this.player2,
    this.isVsBot = false,
    required this.board,
    required this.currentTurn,
  });

  factory MatchData.fromJson(Map<String, dynamic> json) {
    return MatchData(
      gameId: json['gameId'] ?? '',
      player1: PlayerInfo.fromJson(json['player1'] ?? {}),
      player2: PlayerInfo.fromJson(json['player2'] ?? {}),
      isVsBot: json['isVsBot'] ?? false,
      board: List<String>.from(json['board'] ?? []),
      currentTurn: json['currentTurn'] ?? 'X',
    );
  }
}

class PlayerInfo {
  final String userId;
  final String username;
  final String avatar;
  final String symbol;

  PlayerInfo({
    required this.userId,
    required this.username,
    required this.avatar,
    required this.symbol,
  });

  factory PlayerInfo.fromJson(Map<String, dynamic> json) {
    return PlayerInfo(
      userId: json['userId'] ?? '',
      username: json['username'] ?? '',
      avatar: json['avatar'] ?? 'avatar-1',
      symbol: json['symbol'] ?? 'X',
    );
  }
}

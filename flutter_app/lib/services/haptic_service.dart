import 'package:flutter/services.dart';
import '../services/storage_service.dart';

/// Haptic Feedback — нативная виброотдача
class HapticService {
  static final HapticService _instance = HapticService._internal();
  factory HapticService() => _instance;
  HapticService._internal();

  bool _enabled = true;

  void init() {
    _enabled = StorageService().getSettings().vibrate;
  }

  void setEnabled(bool enabled) {
    _enabled = enabled;
  }

  /// Лёгкая вибрация при ходе
  Future<void> move() async {
    if (!_enabled) return;
    await HapticFeedback.lightImpact();
  }

  /// Средняя вибрация при победе
  Future<void> win() async {
    if (!_enabled) return;
    await HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 100));
    await HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 100));
    await HapticFeedback.heavyImpact();
  }

  /// Сильная вибрация при поражении
  Future<void> lose() async {
    if (!_enabled) return;
    await HapticFeedback.heavyImpact();
    await Future.delayed(const Duration(milliseconds: 150));
    await HapticFeedback.heavyImpact();
  }

  /// Короткая вибрация при ничьей
  Future<void> draw() async {
    if (!_enabled) return;
    await HapticFeedback.mediumImpact();
    await Future.delayed(const Duration(milliseconds: 100));
    await HapticFeedback.lightImpact();
  }

  /// Вибрация при ошибке
  Future<void> error() async {
    if (!_enabled) return;
    await HapticFeedback.heavyImpact();
  }

  /// Вибрация при нажатии кнопки
  Future<void> tap() async {
    if (!_enabled) return;
    await HapticFeedback.selectionClick();
  }

  /// Вибрация при успешном действии
  Future<void> success() async {
    if (!_enabled) return;
    await HapticFeedback.lightImpact();
    await Future.delayed(const Duration(milliseconds: 50));
    await HapticFeedback.mediumImpact();
  }
}

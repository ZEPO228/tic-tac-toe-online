import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Тема приложения — тёмная/светлая, соответствует веб-версии
class AppTheme {
  // Colors (соответствуют CSS variables из веб-версии) — PUBLIC
  static const Color darkBg = Color(0xFF0F0F1A);
  static const Color darkCard = Color(0xFF1A1A2E);
  static const Color darkFg = Color(0xFFF8F8FC);
  static const Color primary = Color(0xFF4ADE80);
  static const Color accent = Color(0xFFA78BFA);
  static const Color destructive = Color(0xFFEF4444);
  static const Color mutedFg = Color(0xFF94A3B8);

  static const Color lightBg = Color(0xFFF4F4F6);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightFg = Color(0xFF1A1A2E);

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: darkBg,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      secondary: accent,
      surface: darkCard,
      error: destructive,
      onPrimary: darkBg,
      onSecondary: Colors.white,
      onSurface: darkFg,
      onError: Colors.white,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: darkBg,
      foregroundColor: darkFg,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: darkCard,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: darkCard,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: darkBg,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
      ),
    ),
    textTheme: GoogleFonts.robotoTextTheme(
      const TextTheme(
        bodyLarge: TextStyle(color: darkFg),
        bodyMedium: TextStyle(color: darkFg),
        bodySmall: TextStyle(color: mutedFg),
        titleLarge: TextStyle(color: darkFg, fontWeight: FontWeight.bold),
        titleMedium: TextStyle(color: darkFg, fontWeight: FontWeight.bold),
      ),
    ),
  );

  /// Градиентный фон (соответствует gradient-bg из веб-версии)
  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0F0F1A),
      Color(0xFF1A1A2E),
      Color(0xFF0F0F1A),
    ],
  );
}

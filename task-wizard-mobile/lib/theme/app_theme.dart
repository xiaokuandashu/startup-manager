import 'package:flutter/material.dart';

/// 🎨 绿联云风格主题系统 — 无边框阴影卡片 + 渐变色 + 精致排版
class AppTheme {
  // ========== 品牌色 ==========
  static const primaryBlue = Color(0xFF4C6FFF);
  static const primaryLight = Color(0xFF7B93FF);
  static const primaryDark = Color(0xFF3A56CC);

  // ========== 功能色 ==========
  static const successGreen = Color(0xFF00C48C);
  static const warningOrange = Color(0xFFFF9F43);
  static const errorRed = Color(0xFFFF5B5B);
  static const infoBlue = Color(0xFF3B82F6);

  // ========== 中性色 ==========
  static const textPrimary = Color(0xFF1A1D26);
  static const textSecondary = Color(0xFF6B7280);
  static const textHint = Color(0xFFB0B6C3);
  static const dividerLight = Color(0xFFF0F1F5);
  static const bgPage = Color(0xFFF5F6FA);
  static const bgCard = Colors.white;

  // ========== 渐变 ==========
  static const gradientPrimary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF4C6FFF), Color(0xFF6C8DFF)],
  );

  static const gradientSuccess = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF00C48C), Color(0xFF00E4A0)],
  );

  static const gradientWarm = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF9F43), Color(0xFFFFBB6C)],
  );

  static const gradientHeader = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF4C6FFF), Color(0xFF6C8DFF), Color(0xFFF5F6FA)],
    stops: [0.0, 0.6, 1.0],
  );

  // ========== 阴影 ==========
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: const Color(0xFF1A1D26).withOpacity(0.06),
      blurRadius: 16,
      offset: const Offset(0, 4),
      spreadRadius: 0,
    ),
  ];

  static List<BoxShadow> get cardShadowSmall => [
    BoxShadow(
      color: const Color(0xFF1A1D26).withOpacity(0.04),
      blurRadius: 8,
      offset: const Offset(0, 2),
      spreadRadius: 0,
    ),
  ];

  static List<BoxShadow> get cardShadowLarge => [
    BoxShadow(
      color: const Color(0xFF4C6FFF).withOpacity(0.12),
      blurRadius: 24,
      offset: const Offset(0, 8),
      spreadRadius: 0,
    ),
  ];

  // ========== 亮色主题 ==========
  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryBlue,
      brightness: Brightness.light,
      primary: primaryBlue,
      onPrimary: Colors.white,
      secondary: successGreen,
      background: bgPage,
      surface: bgCard,
      onSurface: textPrimary,
      error: errorRed,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bgPage,
      fontFamily: null, // System default (SF Pro / Roboto)
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: bgCard,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF0F2F8),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primaryBlue, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        hintStyle: const TextStyle(color: textHint, fontSize: 14),
        prefixIconColor: textHint,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: 0.3),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryBlue,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          side: const BorderSide(color: primaryBlue, width: 1.5),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryBlue,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: primaryBlue,
        unselectedItemColor: Color(0xFFB0B6C3),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, height: 1.8),
        unselectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w400, height: 1.8),
      ),
      dividerTheme: const DividerThemeData(
        color: dividerLight,
        thickness: 1,
        space: 0,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) return Colors.white;
          return const Color(0xFFD1D5DB);
        }),
        trackColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) return successGreen;
          return const Color(0xFFE5E7EB);
        }),
        trackOutlineColor: MaterialStateProperty.all(Colors.transparent),
      ),
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 2),
        minVerticalPadding: 0,
      ),
    );
  }

  // ========== 暗色主题 ==========
  static ThemeData dark() {
    const darkBg = Color(0xFF0F1118);
    const darkCard = Color(0xFF1A1D2E);
    const darkDivider = Color(0xFF2A2D3E);

    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryBlue,
      brightness: Brightness.dark,
      primary: primaryLight,
      onPrimary: Colors.white,
      secondary: successGreen,
      background: darkBg,
      surface: darkCard,
      error: errorRed,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: darkBg,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white.withOpacity(0.92),
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white.withOpacity(0.92),
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.3,
        ),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: darkCard,
        shadowColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF242738),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: primaryLight, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 14),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: darkCard,
        selectedItemColor: primaryLight,
        unselectedItemColor: Colors.white.withOpacity(0.35),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, height: 1.8),
        unselectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, height: 1.8),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) return Colors.white;
          return const Color(0xFF6B7280);
        }),
        trackColor: MaterialStateProperty.resolveWith((states) {
          if (states.contains(MaterialState.selected)) return successGreen;
          return const Color(0xFF374151);
        }),
        trackOutlineColor: MaterialStateProperty.all(Colors.transparent),
      ),
      dividerTheme: const DividerThemeData(
        color: darkDivider,
        thickness: 1,
        space: 0,
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Must be overridden in main.dart');
});

/// 用户设置 Provider
final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return SettingsNotifier(prefs);
});

class AppSettings {
  final ThemeMode themeMode;
  final Locale locale;

  const AppSettings({
    this.themeMode = ThemeMode.system,
    this.locale = const Locale('zh'),
  });

  AppSettings copyWith({ThemeMode? themeMode, Locale? locale}) => AppSettings(
    themeMode: themeMode ?? this.themeMode,
    locale: locale ?? this.locale,
  );
}

class SettingsNotifier extends StateNotifier<AppSettings> {
  final SharedPreferences _prefs;

  SettingsNotifier(this._prefs) : super(const AppSettings()) {
    _load();
  }

  void _load() {
    final themeName = _prefs.getString('theme_mode') ?? 'system';
    final langCode = _prefs.getString('language') ?? 'zh';

    state = AppSettings(
      themeMode: _parseThemeMode(themeName),
      locale: Locale(langCode),
    );
  }

  ThemeMode _parseThemeMode(String name) {
    switch (name) {
      case 'light': return ThemeMode.light;
      case 'dark': return ThemeMode.dark;
      default: return ThemeMode.system;
    }
  }

  void setThemeMode(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
    _prefs.setString('theme_mode', mode.name);
  }

  void setLocale(Locale locale) {
    state = state.copyWith(locale: locale);
    _prefs.setString('language', locale.languageCode);
  }
}

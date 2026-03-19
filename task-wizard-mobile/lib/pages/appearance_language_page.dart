import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';

/// 外观与语言二级页面
class AppearanceLanguagePage extends ConsumerWidget {
  const AppearanceLanguagePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.appearanceAndLang), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ===== 外观 =====
            Text(l.appearance, style: TextStyle(
              fontSize: 16, fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : AppTheme.textPrimary,
            )),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: AppTheme.cardShadowSmall,
              ),
              child: Row(
                children: [
                  _themeOption(l.lightMode, Icons.light_mode_rounded, settings.themeMode == ThemeMode.light, isDark, () {
                    ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.light);
                  }),
                  const SizedBox(width: 6),
                  _themeOption(l.darkMode, Icons.dark_mode_rounded, settings.themeMode == ThemeMode.dark, isDark, () {
                    ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.dark);
                  }),
                  const SizedBox(width: 6),
                  _themeOption(l.systemMode, Icons.settings_brightness_rounded, settings.themeMode == ThemeMode.system, isDark, () {
                    ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.system);
                  }),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // ===== 语言 =====
            Text(l.language, style: TextStyle(
              fontSize: 16, fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : AppTheme.textPrimary,
            )),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: AppTheme.cardShadowSmall,
              ),
              child: Column(
                children: [
                  _langItem('中文', 'zh', settings.locale.languageCode, isDark, ref, isFirst: true),
                  _divider(isDark),
                  _langItem('English', 'en', settings.locale.languageCode, isDark, ref),
                  _divider(isDark),
                  _langItem('日本語', 'ja', settings.locale.languageCode, isDark, ref),
                  _divider(isDark),
                  _langItem('한국어', 'ko', settings.locale.languageCode, isDark, ref),
                  _divider(isDark),
                  _langItem('ภาษาไทย', 'th', settings.locale.languageCode, isDark, ref),
                  _divider(isDark),
                  _langItem('Bahasa Malaysia', 'ms', settings.locale.languageCode, isDark, ref, isLast: true),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _themeOption(String label, IconData icon, bool selected, bool isDark, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected
              ? AppTheme.primaryBlue
              : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              Icon(icon, size: 22, color: selected ? Colors.white : (isDark ? Colors.white54 : AppTheme.textSecondary)),
              const SizedBox(height: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  color: selected ? Colors.white : (isDark ? Colors.white54 : AppTheme.textSecondary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _langItem(String label, String code, String currentCode, bool isDark, WidgetRef ref, {bool isFirst = false, bool isLast = false}) {
    final selected = code == currentCode;
    return InkWell(
      onTap: () {
        ref.read(settingsProvider.notifier).setLocale(Locale(code));
      },
      borderRadius: BorderRadius.vertical(
        top: isFirst ? const Radius.circular(14) : Radius.zero,
        bottom: isLast ? const Radius.circular(14) : Radius.zero,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Row(
          children: [
            Text(label, style: TextStyle(
              fontSize: 15,
              color: isDark ? Colors.white : AppTheme.textPrimary,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
            )),
            const Spacer(),
            if (selected) const Icon(Icons.check_circle_rounded, size: 22, color: AppTheme.primaryBlue),
          ],
        ),
      ),
    );
  }

  Widget _divider(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Divider(height: 1, color: isDark ? Colors.white10 : const Color(0xFFF0F1F5)),
    );
  }
}

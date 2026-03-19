import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';

/// 👤 我的页 — 绿联云风格设置页面
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final auth = ref.watch(authProvider);
    final settings = ref.watch(settingsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ===== 渐变头部区域 =====
            Container(
              width: double.infinity,
              padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 16),
              decoration: BoxDecoration(
                gradient: isDark
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF1E234A), Color(0xFF0F1118)],
                    )
                  : AppTheme.gradientPrimary,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
              child: Column(
                children: [
                  // Title
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Text(
                          l.tabProfile,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          width: 38, height: 38,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.settings_rounded, size: 20, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // User profile card
                  Container(
                    margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(isDark ? 0.08 : 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        // Avatar
                        Stack(
                          children: [
                            Container(
                              width: 60, height: 60,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white.withOpacity(0.3), width: 2),
                              ),
                              child: const Icon(Icons.person_rounded, size: 32, color: Colors.white),
                            ),
                            // Edit badge
                            Positioned(
                              right: 0, bottom: 0,
                              child: Container(
                                width: 22, height: 22,
                                decoration: BoxDecoration(
                                  color: AppTheme.warningOrange,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(Icons.edit, size: 11, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                auth.email ?? '未登录',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.successGreen.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '3 台设备',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.9)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.warningOrange.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      'VIP',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.9)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: Colors.white.withOpacity(0.5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // ===== Settings sections =====
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 设备管理
                  _sectionTitle(l.deviceManagement, isDark),
                  const SizedBox(height: 8),
                  _settingsCard([
                    _buildMenuItem(Icons.devices_rounded, l.deviceManagement, trailing: '3 台', isDark: isDark),
                    _divider(isDark),
                    _buildMenuItem(Icons.qr_code_scanner_rounded, l.isZh ? '扫码配对' : 'QR Pairing', isDark: isDark),
                  ], isDark),

                  const SizedBox(height: 20),

                  // AI 模型设置
                  _sectionTitle(l.aiModelSettings, isDark),
                  const SizedBox(height: 8),
                  _settingsCard([
                    _buildMenuItem(Icons.cloud_rounded, 'API Key 设置', trailing: l.isZh ? '已配置' : 'Set', isDark: isDark, trailingColor: AppTheme.successGreen),
                    _divider(isDark),
                    _buildMenuItem(Icons.phone_android_rounded, l.isZh ? '手机本地模型' : 'Local Model', trailing: l.isZh ? '未下载' : 'N/A', isDark: isDark),
                  ], isDark),

                  const SizedBox(height: 20),

                  // 外观
                  _sectionTitle(l.appearance, isDark),
                  const SizedBox(height: 8),
                  _settingsCard([
                    _buildThemeSelector(ref, settings, l, isDark),
                    _divider(isDark),
                    _buildLanguageSelector(ref, settings, l, isDark),
                  ], isDark),

                  const SizedBox(height: 20),

                  // 安全设置
                  _sectionTitle(l.security, isDark),
                  const SizedBox(height: 8),
                  _settingsCard([
                    _buildSwitchItem(Icons.fingerprint_rounded, l.isZh ? '指纹锁' : 'Fingerprint', false, (v) {}, isDark),
                    _divider(isDark),
                    _buildSwitchItem(Icons.verified_user_rounded, l.isZh ? '自动授权响应' : 'Auto Auth', false, (v) {}, isDark),
                    _divider(isDark),
                    _buildSwitchItem(Icons.sms_rounded, l.isZh ? '短信验证码自动转发' : 'SMS Forward', true, (v) {}, isDark),
                  ], isDark),

                  const SizedBox(height: 20),

                  // 关于
                  _settingsCard([
                    _buildMenuItem(Icons.info_outline_rounded, l.about, trailing: 'v1.0.0', isDark: isDark),
                  ], isDark),

                  const SizedBox(height: 24),

                  // 退出登录按钮
                  GestureDetector(
                    onTap: () => ref.read(authProvider.notifier).logout(),
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: BoxDecoration(
                        color: isDark ? AppTheme.errorRed.withOpacity(0.12) : AppTheme.errorRed.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.errorRed.withOpacity(0.2)),
                      ),
                      child: Center(
                        child: Text(
                          l.logout,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.errorRed,
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 版本信息
                  Center(
                    child: Text(
                      '${l.appTitle} v1.0.0',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.white24 : AppTheme.textHint,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title, bool isDark) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: isDark ? Colors.white54 : AppTheme.textSecondary,
        letterSpacing: 0.3,
      ),
    );
  }

  Widget _settingsCard(List<Widget> children, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(children: children),
    );
  }

  Widget _divider(bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 18),
      height: 1,
      color: isDark ? const Color(0xFF2A2D3E) : AppTheme.dividerLight,
    );
  }

  Widget _buildMenuItem(IconData icon, String title, {String? trailing, bool isDark = false, Color? trailingColor}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {},
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: AppTheme.primaryBlue),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
                  ),
                ),
              ),
              if (trailing != null)
                Text(
                  trailing,
                  style: TextStyle(
                    fontSize: 13,
                    color: trailingColor ?? (isDark ? Colors.white38 : AppTheme.textHint),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, size: 20, color: isDark ? Colors.white24 : const Color(0xFFD0D5E0)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSwitchItem(IconData icon, String title, bool value, ValueChanged<bool> onChanged, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryBlue),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildThemeSelector(WidgetRef ref, AppSettings settings, AppLocalizations l, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.palette_rounded, size: 20, color: AppTheme.primaryBlue),
          ),
          const SizedBox(width: 14),
          Text(
            l.appearance,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
            ),
          ),
          const Spacer(),
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF242738) : const Color(0xFFF0F2F8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                _themeOption(l.lightMode, settings.themeMode == ThemeMode.light, isDark, () {
                  ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.light);
                }),
                _themeOption(l.darkMode, settings.themeMode == ThemeMode.dark, isDark, () {
                  ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.dark);
                }),
                _themeOption(l.systemMode, settings.themeMode == ThemeMode.system, isDark, () {
                  ref.read(settingsProvider.notifier).setThemeMode(ThemeMode.system);
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _themeOption(String label, bool selected, bool isDark, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          gradient: selected ? AppTheme.gradientPrimary : null,
          borderRadius: BorderRadius.circular(10),
          boxShadow: selected ? [
            BoxShadow(
              color: AppTheme.primaryBlue.withOpacity(0.3),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? Colors.white : (isDark ? Colors.white54 : AppTheme.textSecondary),
          ),
        ),
      ),
    );
  }

  Widget _buildLanguageSelector(WidgetRef ref, AppSettings settings, AppLocalizations l, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.language_rounded, size: 20, color: AppTheme.primaryBlue),
          ),
          const SizedBox(width: 14),
          Text(
            l.language,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
            ),
          ),
          const Spacer(),
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF242738) : const Color(0xFFF0F2F8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                _themeOption('中文', settings.locale.languageCode == 'zh', isDark, () {
                  ref.read(settingsProvider.notifier).setLocale(const Locale('zh'));
                }),
                _themeOption('EN', settings.locale.languageCode == 'en', isDark, () {
                  ref.read(settingsProvider.notifier).setLocale(const Locale('en'));
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

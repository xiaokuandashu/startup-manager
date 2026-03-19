import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';

/// 关于页面 — 仿绿联云风格
class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.about), centerTitle: true),
      body: Column(
        children: [
          const SizedBox(height: 40),
          // Logo
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Center(
              child: Text('🧙', style: TextStyle(fontSize: 42)),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '${l.appTitle} v1.0.0',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 40),

          // 菜单列表
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppTheme.cardShadow,
            ),
            child: Column(
              children: [
                _menuItem(
                  l.versionUpdate, l.latestVersion,
                  isDark, isFirst: true,
                  onTap: () => _checkUpdate(context),
                ),
                _divider(isDark),
                _menuItem(
                  l.featureIntro, '',
                  isDark,
                  onTap: () => _showFeatures(context, isDark, l),
                ),
                _divider(isDark),
                _menuItem(
                  l.privacyPolicy, '',
                  isDark,
                  onTap: () => _showAgreement(context, 'privacy', l.privacyPolicy, isDark),
                ),
                _divider(isDark),
                _menuItem(
                  l.userAgreement, '',
                  isDark, isLast: true,
                  onTap: () => _showAgreement(context, 'user', l.userAgreement, isDark),
                ),
              ],
            ),
          ),

          const Spacer(),

          // 底部
          Padding(
            padding: const EdgeInsets.only(bottom: 40),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    GestureDetector(
                      onTap: () => _showAgreement(context, 'privacy', l.privacyPolicy, isDark),
                      child: Text(l.privacyPolicy, style: const TextStyle(fontSize: 13, color: AppTheme.primaryBlue)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('|', style: TextStyle(fontSize: 13, color: isDark ? Colors.white24 : AppTheme.textHint)),
                    ),
                    GestureDetector(
                      onTap: () => _showAgreement(context, 'user', l.userAgreement, isDark),
                      child: Text(l.userAgreement, style: const TextStyle(fontSize: 13, color: AppTheme.primaryBlue)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '© 2025 ${l.appTitle}',
                  style: TextStyle(fontSize: 12, color: isDark ? Colors.white24 : AppTheme.textHint),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _menuItem(String title, String trailing, bool isDark, {bool isFirst = false, bool isLast = false, VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.vertical(
        top: isFirst ? const Radius.circular(16) : Radius.zero,
        bottom: isLast ? const Radius.circular(16) : Radius.zero,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            Text(title, style: TextStyle(fontSize: 15, color: isDark ? Colors.white : AppTheme.textPrimary)),
            const Spacer(),
            if (trailing.isNotEmpty)
              Text(trailing, style: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : AppTheme.textHint)),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right_rounded, size: 20, color: isDark ? Colors.white24 : const Color(0xFFD0D5E0)),
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

  void _checkUpdate(BuildContext context) async {
    try {
      final data = await ApiService.checkUpdate('android', '1.0.0');
      final l = AppLocalizations.of(context);
      if (data['has_update'] == true) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text('${l.versionUpdate}: ${data['version']}'),
            content: Text(data['changelog'] ?? ''),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.ok)),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.latestVersion)));
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('检查更新失败')));
    }
  }

  void _showFeatures(BuildContext context, bool isDark, AppLocalizations l) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(l.featureIntro), centerTitle: true),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            _featureCard('🎯', l.isZh ? '任务管理' : 'Task Management', l.isZh ? '创建、编辑、定时执行任务' : 'Create, edit, schedule tasks', isDark),
            _featureCard('🤖', l.isZh ? 'AI 助手' : 'AI Assistant', l.isZh ? '智能AI助手，支持本地+云端模型' : 'Smart AI with local + cloud models', isDark),
            _featureCard('📱', l.isZh ? '手机遥控' : 'Remote Control', l.isZh ? '手机远程控制电脑执行任务' : 'Control PC tasks from phone', isDark),
            _featureCard('🔗', l.isZh ? '多设备协同' : 'Multi-Device', l.isZh ? '支持100台设备同时管理' : 'Manage up to 100 devices', isDark),
            _featureCard('📝', l.isZh ? '脚本执行' : 'Script Execution', l.isZh ? '支持自定义脚本远程执行' : 'Run custom scripts remotely', isDark),
            _featureCard('🔒', l.isZh ? '安全可靠' : 'Secure', l.isZh ? '数据加密传输，安全可靠' : 'Encrypted data transmission', isDark),
          ],
        ),
      ),
    ));
  }

  Widget _featureCard(String emoji, String title, String desc, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: AppTheme.cardShadowSmall,
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: isDark ? Colors.white : AppTheme.textPrimary)),
                const SizedBox(height: 4),
                Text(desc, style: TextStyle(fontSize: 13, color: isDark ? Colors.white54 : AppTheme.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showAgreement(BuildContext context, String type, String title, bool isDark) async {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => _AgreementPage(type: type, title: title),
    ));
  }
}

class _AgreementPage extends StatefulWidget {
  final String type;
  final String title;
  const _AgreementPage({required this.type, required this.title});

  @override
  State<_AgreementPage> createState() => _AgreementPageState();
}

class _AgreementPageState extends State<_AgreementPage> {
  String _content = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    try {
      final data = await ApiService.getAgreement(widget.type);
      final lang = AppLocalizations.of(context).isZh ? 'zh' : 'en';
      setState(() {
        _content = data['content_$lang'] ?? data['content_zh'] ?? '';
        _loading = false;
      });
    } catch (_) {
      setState(() { _content = '加载失败'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title), centerTitle: true),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Text(_content, style: TextStyle(fontSize: 14, height: 1.8, color: Theme.of(context).brightness == Brightness.dark ? Colors.white70 : AppTheme.textPrimary)),
          ),
    );
  }
}

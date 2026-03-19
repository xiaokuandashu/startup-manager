import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();
  bool _isCodeMode = false;
  bool _codeSent = false;
  int _countdown = 0;
  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _startCountdown() {
    setState(() { _countdown = 60; _codeSent = true; });
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() { _countdown--; });
      return _countdown > 0;
    });
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) return;

    if (_isCodeMode) {
      final code = _codeController.text.trim();
      if (code.isEmpty) return;
      await ref.read(authProvider.notifier).loginWithCode(email, code);
    } else {
      final password = _passwordController.text.trim();
      if (password.isEmpty) return;
      await ref.read(authProvider.notifier).loginWithPassword(email, password);
    }
  }

  Future<void> _sendCode() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) return;
    await ref.read(authProvider.notifier).sendVerifyCode(email);
    _startCountdown();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final auth = ref.watch(authProvider);
    final size = MediaQuery.of(context).size;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          // 渐变弧形背景
          Positioned(
            top: 0, left: 0, right: 0,
            height: size.height * 0.42,
            child: Container(
              decoration: BoxDecoration(
                gradient: isDark
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF1E234A), Color(0xFF0F1118)],
                    )
                  : AppTheme.gradientPrimary,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(40),
                  bottomRight: Radius.circular(40),
                ),
              ),
            ),
          ),

          // 装饰圆形光效
          Positioned(
            top: -50, right: -40,
            child: Container(
              width: 200, height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.08),
              ),
            ),
          ),
          Positioned(
            top: 80, left: -60,
            child: Container(
              width: 150, height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.05),
              ),
            ),
          ),

          // 主体内容
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 30),

                      // Logo
                      Center(
                        child: Container(
                          width: 96, height: 96,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(28),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.15),
                                blurRadius: 30,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(28),
                            child: Image.asset(
                              'assets/images/logo.png',
                              width: 96, height: 96,
                              errorBuilder: (_, __, ___) => Container(
                                width: 96, height: 96,
                                decoration: BoxDecoration(
                                  gradient: AppTheme.gradientPrimary,
                                  borderRadius: BorderRadius.circular(28),
                                ),
                                child: const Icon(Icons.auto_awesome, size: 48, color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // 标题
                      Text(
                        l.appTitle,
                        style: const TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Smart Task Automation',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.7),
                          letterSpacing: 1.2,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 44),

                      // 登录卡片
                      Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: AppTheme.cardShadowLarge,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // 邮箱
                            _buildLabel(l.email),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              style: TextStyle(
                                fontSize: 15,
                                color: isDark ? Colors.white : AppTheme.textPrimary,
                              ),
                              decoration: InputDecoration(
                                hintText: l.emailHint,
                                prefixIcon: const Icon(Icons.email_outlined, size: 20),
                              ),
                            ),
                            const SizedBox(height: 20),

                            // 密码或验证码
                            if (_isCodeMode) ...[
                              _buildLabel(l.verifyCode),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: _codeController,
                                      keyboardType: TextInputType.number,
                                      style: TextStyle(
                                        fontSize: 15,
                                        color: isDark ? Colors.white : AppTheme.textPrimary,
                                      ),
                                      decoration: InputDecoration(
                                        hintText: l.codeHint,
                                        prefixIcon: const Icon(Icons.shield_outlined, size: 20),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Container(
                                    height: 52,
                                    decoration: BoxDecoration(
                                      gradient: _countdown > 0 ? null : AppTheme.gradientPrimary,
                                      color: _countdown > 0 ? (isDark ? const Color(0xFF2D3148) : const Color(0xFFE8EBF5)) : null,
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        onTap: _countdown > 0 ? null : _sendCode,
                                        borderRadius: BorderRadius.circular(14),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 18),
                                          child: Center(
                                            child: Text(
                                              _countdown > 0 ? '${_countdown}s' : l.sendCode,
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                                color: _countdown > 0
                                                  ? (isDark ? Colors.white38 : AppTheme.textHint)
                                                  : Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ] else ...[
                              _buildLabel(l.password),
                              const SizedBox(height: 8),
                              TextField(
                                controller: _passwordController,
                                obscureText: true,
                                style: TextStyle(
                                  fontSize: 15,
                                  color: isDark ? Colors.white : AppTheme.textPrimary,
                                ),
                                decoration: InputDecoration(
                                  hintText: l.passwordHint,
                                  prefixIcon: const Icon(Icons.key_rounded, size: 20),
                                ),
                              ),
                            ],

                            // 切换模式
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => setState(() { _isCodeMode = !_isCodeMode; }),
                                child: Text(
                                  _isCodeMode ? l.loginWithPassword : l.loginWithCode,
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                            ),

                            // 错误提示
                            if (auth.error != null) ...[
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppTheme.errorRed.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppTheme.errorRed.withOpacity(0.2)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.error_outline, size: 18, color: AppTheme.errorRed),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        auth.error!,
                                        style: TextStyle(color: AppTheme.errorRed, fontSize: 13),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],
                            const SizedBox(height: 8),

                            // 登录按钮
                            Container(
                              height: 54,
                              decoration: BoxDecoration(
                                gradient: auth.isLoading ? null : AppTheme.gradientPrimary,
                                color: auth.isLoading ? (isDark ? const Color(0xFF2D3148) : const Color(0xFFD0D5E8)) : null,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: auth.isLoading ? null : [
                                  BoxShadow(
                                    color: AppTheme.primaryBlue.withOpacity(0.35),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: auth.isLoading ? null : _login,
                                  borderRadius: BorderRadius.circular(16),
                                  child: Center(
                                    child: auth.isLoading
                                      ? const SizedBox(
                                          width: 22, height: 22,
                                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                        )
                                      : Text(
                                          l.login,
                                          style: const TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.white,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // 注册链接
                      Center(
                        child: TextButton(
                          onPressed: () {/* TODO: Navigate to register page */},
                          child: RichText(
                            text: TextSpan(
                              style: TextStyle(fontSize: 14, color: isDark ? Colors.white54 : AppTheme.textSecondary),
                              children: [
                                const TextSpan(text: '还没有账号？'),
                                TextSpan(
                                  text: ' ${l.register}',
                                  style: const TextStyle(color: AppTheme.primaryBlue, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppTheme.textSecondary,
        letterSpacing: 0.3,
      ),
    );
  }
}

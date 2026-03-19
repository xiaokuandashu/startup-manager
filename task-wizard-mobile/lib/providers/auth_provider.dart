import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'settings_provider.dart';

/// Auth 状态
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return AuthNotifier(prefs);
});

class AuthState {
  final bool isLoggedIn;
  final String? token;
  final String? email;
  final String? userId;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.isLoggedIn = false,
    this.token,
    this.email,
    this.userId,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isLoggedIn, String? token, String? email,
    String? userId, bool? isLoading, String? error,
  }) => AuthState(
    isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    token: token ?? this.token,
    email: email ?? this.email,
    userId: userId ?? this.userId,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final SharedPreferences _prefs;

  AuthNotifier(this._prefs) : super(const AuthState()) {
    _loadSaved();
  }

  void _loadSaved() {
    final token = _prefs.getString('auth_token');
    final email = _prefs.getString('auth_email');
    final userId = _prefs.getString('auth_user_id');
    if (token != null && token.isNotEmpty) {
      state = AuthState(isLoggedIn: true, token: token, email: email, userId: userId);
    }
  }

  /// 密码登录
  Future<void> loginWithPassword(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await ApiService.loginWithPassword(email, password);
      // 服务器返回 {error: "..."} 表示失败
      if (result.containsKey('error')) {
        state = state.copyWith(isLoading: false, error: result['error']);
        return;
      }
      await _handleLoginSuccess(result, email);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '网络错误: ${e.toString()}');
    }
  }

  /// 验证码登录
  Future<void> loginWithCode(String email, String code) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await ApiService.loginWithCode(email, code);
      if (result.containsKey('error')) {
        state = state.copyWith(isLoading: false, error: result['error']);
        return;
      }
      await _handleLoginSuccess(result, email);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: '网络错误: ${e.toString()}');
    }
  }

  /// 处理登录成功响应 {token, user: {id, email, vipStatus}}
  Future<void> _handleLoginSuccess(Map<String, dynamic> result, String email) async {
    final token = result['token'] as String;
    final user = result['user'] as Map<String, dynamic>?;
    final userId = user?['id'] ?? '';

    await _prefs.setString('auth_token', token);
    await _prefs.setString('auth_email', email);
    await _prefs.setString('auth_user_id', userId.toString());

    state = AuthState(
      isLoggedIn: true,
      token: token,
      email: email,
      userId: userId.toString(),
    );
  }

  /// 发送验证码
  Future<void> sendVerifyCode(String email) async {
    try {
      await ApiService.sendVerifyCode(email);
    } catch (_) {}
  }

  Future<void> logout() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('auth_email');
    await _prefs.remove('auth_user_id');
    state = const AuthState();
  }
}

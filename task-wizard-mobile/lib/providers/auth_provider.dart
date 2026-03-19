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
  final String? vipStatus;      // 'active' | 'expired' | null
  final String? vipExpireDate;  // 'YYYY-MM-DD' | null
  final bool isLoading;
  final String? error;

  const AuthState({
    this.isLoggedIn = false,
    this.token,
    this.email,
    this.userId,
    this.vipStatus,
    this.vipExpireDate,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isLoggedIn, String? token, String? email,
    String? userId, String? vipStatus, String? vipExpireDate,
    bool? isLoading, String? error,
  }) => AuthState(
    isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    token: token ?? this.token,
    email: email ?? this.email,
    userId: userId ?? this.userId,
    vipStatus: vipStatus ?? this.vipStatus,
    vipExpireDate: vipExpireDate ?? this.vipExpireDate,
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
    final vipStatus = _prefs.getString('auth_vip_status');
    final vipExpire = _prefs.getString('auth_vip_expire');
    if (token != null && token.isNotEmpty) {
      state = AuthState(
        isLoggedIn: true, token: token, email: email,
        userId: userId, vipStatus: vipStatus, vipExpireDate: vipExpire,
      );
    }
  }

  /// 密码登录
  Future<void> loginWithPassword(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await ApiService.loginWithPassword(email, password);
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

  /// 处理登录成功响应 {token, user: {id, email, vipStatus, vipExpireDate}}
  Future<void> _handleLoginSuccess(Map<String, dynamic> result, String email) async {
    final token = result['token'] as String;
    final user = result['user'] as Map<String, dynamic>?;
    final userId = user?['id'] ?? '';
    final vipStatus = user?['vipStatus']?.toString();
    final vipExpire = user?['vipExpireDate']?.toString();

    await _prefs.setString('auth_token', token);
    await _prefs.setString('auth_email', email);
    await _prefs.setString('auth_user_id', userId.toString());
    if (vipStatus != null) await _prefs.setString('auth_vip_status', vipStatus);
    if (vipExpire != null) await _prefs.setString('auth_vip_expire', vipExpire);

    state = AuthState(
      isLoggedIn: true,
      token: token,
      email: email,
      userId: userId.toString(),
      vipStatus: vipStatus,
      vipExpireDate: vipExpire,
    );
  }

  /// 更新 VIP 状态（激活码激活后调用）
  void updateVip(String status, String? expireDate) {
    state = state.copyWith(vipStatus: status, vipExpireDate: expireDate);
    _prefs.setString('auth_vip_status', status);
    if (expireDate != null) _prefs.setString('auth_vip_expire', expireDate);
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
    await _prefs.remove('auth_vip_status');
    await _prefs.remove('auth_vip_expire');
    state = const AuthState();
  }
}

import 'dart:convert';
import 'package:http/http.dart' as http;

/// API 服务 — 对接服务器 bt.aacc.fun:8888
class ApiService {
  static const _baseUrl = 'https://bt.aacc.fun:8888/api';

  /// 密码登录 → POST /auth/login-password {email, password}
  /// 返回 {token, user: {id, email, vipStatus, vipExpireDate}}
  static Future<Map<String, dynamic>> loginWithPassword(String email, String password) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/auth/login-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    return jsonDecode(resp.body);
  }

  /// 验证码登录 → POST /auth/login {email, code}
  /// 返回 {token, user: {id, email, vipStatus, vipExpireDate}}
  static Future<Map<String, dynamic>> loginWithCode(String email, String code) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'code': code}),
    );
    return jsonDecode(resp.body);
  }

  /// 发送验证码 → POST /auth/send-code {email}
  static Future<Map<String, dynamic>> sendVerifyCode(String email) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/auth/send-code'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );
    return jsonDecode(resp.body);
  }

  /// 注册 → POST /auth/register {email, code, password}
  static Future<Map<String, dynamic>> register(String email, String code, String password) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'code': code, 'password': password}),
    );
    return jsonDecode(resp.body);
  }

  /// 获取用户信息
  static Future<Map<String, dynamic>> getUserInfo(String token) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/auth/user-info'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(resp.body);
  }

  /// 云端 AI 对话 → POST /deepseek/chat
  /// 通过服务端代理调用 DeepSeek API
  static Future<Map<String, dynamic>> cloudAiChat(String token, String message, String model) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/deepseek/chat'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'model': model == 'cloud' ? 'deepseek_cloud' : model,
        'messages': [
          {'role': 'user', 'content': message},
        ],
      }),
    );
    return jsonDecode(resp.body);
  }
}

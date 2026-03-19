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

  /// 获取 DeepSeek 使用量 → GET /deepseek/usage
  /// 返回 {remaining, daily_limit, has_custom_key}
  static Future<Map<String, dynamic>> getDeepseekUsage(String token) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/deepseek/usage'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(resp.body);
  }

  /// 更新 DeepSeek 密钥 → POST /activation/profile/deepseek-key
  static Future<Map<String, dynamic>> updateDeepseekKey(String token, String key) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/activation/profile/deepseek-key'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'deepseek_key': key}),
    );
    return jsonDecode(resp.body);
  }

  /// 激活码激活 → POST /activation/activate
  static Future<Map<String, dynamic>> activateCode(String token, String code) async {
    final resp = await http.post(
      Uri.parse('$_baseUrl/activation/activate'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'code': code}),
    );
    return jsonDecode(resp.body);
  }

  /// 获取任务统计 → GET /devices/tasks/summary
  static Future<Map<String, dynamic>> getTaskSummary(String token) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/devices/tasks/summary'),
      headers: {'Authorization': 'Bearer $token'},
    ).timeout(const Duration(seconds: 10));
    return jsonDecode(resp.body);
  }

  /// 获取操作日志 → GET /devices/activity-log
  static Future<Map<String, dynamic>> getActivityLog(String token, {int limit = 20}) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/devices/activity-log?limit=$limit'),
      headers: {'Authorization': 'Bearer $token'},
    ).timeout(const Duration(seconds: 10));
    return jsonDecode(resp.body);
  }

  /// 远程退出设备 → DELETE /devices/:deviceId
  static Future<Map<String, dynamic>> deleteDevice(String token, String deviceId) async {
    final resp = await http.delete(
      Uri.parse('$_baseUrl/devices/$deviceId'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(resp.body);
  }

  /// 检查更新 → GET /devices/updates/check
  static Future<Map<String, dynamic>> checkUpdate(String platform, String version) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/devices/updates/check?platform=$platform&version=$version'),
    ).timeout(const Duration(seconds: 10));
    return jsonDecode(resp.body);
  }

  /// 获取协议内容 → GET /auth/agreement/:type
  static Future<Map<String, dynamic>> getAgreement(String type) async {
    final resp = await http.get(
      Uri.parse('$_baseUrl/auth/agreement/$type'),
    ).timeout(const Duration(seconds: 10));
    return jsonDecode(resp.body);
  }
}

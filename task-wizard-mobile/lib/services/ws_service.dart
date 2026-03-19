import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/message.dart';

/// WebSocket 服务 — 通过服务器中继连接电脑
/// 服务器地址: wss://bt.aacc.fun:8888/ws
class WsService {
  WebSocketChannel? _channel;
  final _messageController = StreamController<WsMessage>.broadcast();
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  bool _isConnected = false;
  bool _authenticated = false;
  String? _token;
  String? _serverUrl;

  // 连接状态变化通知
  final _statusController = StreamController<bool>.broadcast();

  Stream<WsMessage> get messages => _messageController.stream;
  Stream<bool> get connectionStatus => _statusController.stream;
  bool get isConnected => _isConnected && _authenticated;

  /// 连接到服务器中继
  /// [token] JWT 认证令牌
  /// [serverUrl] 服务器 WS 地址，默认 wss://bt.aacc.fun:8888/ws
  Future<bool> connectRelay(String token, {String serverUrl = 'wss://bt.aacc.fun:8888/ws'}) async {
    _token = token;
    _serverUrl = serverUrl;
    return _connect();
  }

  Future<bool> _connect() async {
    if (_token == null || _serverUrl == null) return false;
    try {
      disconnect(autoReconnect: false);
      final uri = Uri.parse(_serverUrl!);
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;
      _isConnected = true;
      _listen();
      _startHeartbeat();

      // 发送认证
      _channel!.sink.add(jsonEncode({
        'type': 'auth',
        'token': _token,
        'client_type': 'mobile',
      }));

      return true;
    } catch (e) {
      _isConnected = false;
      _statusController.add(false);
      _scheduleReconnect();
      return false;
    }
  }

  /// 断开连接
  void disconnect({bool autoReconnect = true}) {
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _authenticated = false;
    _statusController.add(false);
    if (!autoReconnect) {
      _token = null;
      _serverUrl = null;
    }
  }

  /// 发送消息
  void send(WsMessage msg) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(msg.toJson()));
    }
  }

  /// 发送 AI 对话
  void sendAiChat({
    required String deviceId,
    required String message,
    required String model,
    bool deepThink = false,
    bool smartSearch = false,
    bool localExec = false,
  }) {
    send(WsMessage(type: 'ai_chat', data: {
      'device_id': deviceId,
      'message': message,
      'model': model,
      'deep_think': deepThink,
      'smart_search': smartSearch,
      'local_exec': localExec,
    }));
  }

  /// 切换模型
  void sendSwitchModel(String deviceId, String model) {
    send(WsMessage(type: 'switch_model', data: {
      'device_id': deviceId,
      'model': model,
    }));
  }

  /// 切换功能开关
  void sendToggleFeature(String deviceId, String feature, bool enabled) {
    send(WsMessage(type: 'toggle_feature', data: {
      'device_id': deviceId,
      'feature': feature,
      'enabled': enabled,
    }));
  }

  /// 更新 DeepSeek 密钥
  void sendUpdateKey(String key) {
    send(WsMessage(type: 'update_key', data: {
      'key': key,
    }));
  }

  /// 查询密钥状态
  void sendGetKey() {
    send(WsMessage(type: 'get_key'));
  }

  /// 获取 PC 上可用模型
  void sendGetModels(String deviceId) {
    send(WsMessage(type: 'get_models', data: {
      'device_id': deviceId,
    }));
  }

  /// 发送任务执行
  void sendTaskExecute(String deviceId, String taskId) {
    send(WsMessage(type: 'task_execute', data: {
      'device_id': deviceId,
      'task_id': taskId,
    }));
  }

  /// 远程启动 App
  void sendLaunchApp(String deviceId, String appPath) {
    send(WsMessage(type: 'launch_app', data: {
      'device_id': deviceId,
      'app_path': appPath,
    }));
  }

  /// 远程执行脚本
  void sendExecuteScript(String deviceId, String script, String scriptType) {
    send(WsMessage(type: 'execute_script', data: {
      'device_id': deviceId,
      'script_content': script,
      'script_type': scriptType,
    }));
  }

  void _listen() {
    _channel?.stream.listen(
      (data) {
        try {
          final json = jsonDecode(data as String);
          final type = json['type'] as String?;

          // 处理认证结果
          if (type == 'auth_ok') {
            _authenticated = true;
            _statusController.add(true);
          } else if (type == 'auth_error') {
            _authenticated = false;
            _statusController.add(false);
          } else if (type == 'pong') {
            // 心跳回复，忽略
            return;
          }

          // 将所有消息转发到 stream
          _messageController.add(WsMessage.fromJson(json));
        } catch (_) {}
      },
      onDone: () {
        _isConnected = false;
        _authenticated = false;
        _statusController.add(false);
        _scheduleReconnect();
      },
      onError: (e) {
        _isConnected = false;
        _authenticated = false;
        _statusController.add(false);
        _scheduleReconnect();
      },
    );
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      send(WsMessage(type: 'ping'));
    });
  }

  void _scheduleReconnect() {
    if (_token == null || _serverUrl == null) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 5), () {
      _connect();
    });
  }

  void dispose() {
    disconnect(autoReconnect: false);
    _messageController.close();
    _statusController.close();
  }
}

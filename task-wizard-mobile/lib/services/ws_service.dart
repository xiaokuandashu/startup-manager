import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/message.dart';

/// WebSocket 服务 — 直连电脑或通过云端中继
class WsService {
  WebSocketChannel? _channel;
  final _messageController = StreamController<WsMessage>.broadcast();
  Timer? _heartbeatTimer;
  bool _isConnected = false;

  Stream<WsMessage> get messages => _messageController.stream;
  bool get isConnected => _isConnected;

  /// 连接到电脑 (局域网直连)
  Future<bool> connectDirect(String ip, {int port = 19527}) async {
    try {
      final uri = Uri.parse('ws://$ip:$port');
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready;
      _isConnected = true;
      _listen();
      _startHeartbeat();
      return true;
    } catch (e) {
      _isConnected = false;
      return false;
    }
  }

  /// 断开连接
  void disconnect() {
    _heartbeatTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
  }

  /// 发送消息
  void send(WsMessage msg) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(msg.toJson()));
    }
  }

  /// 发送任务执行
  void sendTaskExecute(String deviceId, String taskId) {
    send(WsMessage(type: 'task_execute', data: {
      'device_id': deviceId,
      'task_id': taskId,
    }));
  }

  /// 发送 AI 对话
  void sendAiChat(String deviceId, String message, String model) {
    send(WsMessage(type: 'ai_chat', data: {
      'device_id': deviceId,
      'message': message,
      'model': model,
    }));
  }

  /// 发送验证码到电脑
  void sendSmsCode(String code, String from) {
    send(WsMessage(type: 'sms_code', data: {
      'code': code,
      'from': from,
    }));
  }

  /// 发送授权确认
  void sendAuthConfirm(String requestId) {
    send(WsMessage(type: 'auth_confirm', data: {
      'request_id': requestId,
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
          _messageController.add(WsMessage.fromJson(json));
        } catch (_) {}
      },
      onDone: () {
        _isConnected = false;
        // Auto reconnect after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          // Reconnect logic can be added here
        });
      },
      onError: (e) {
        _isConnected = false;
      },
    );
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      send(WsMessage(type: 'ping'));
    });
  }

  void dispose() {
    disconnect();
    _messageController.close();
  }
}

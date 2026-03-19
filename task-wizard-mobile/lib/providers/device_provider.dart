import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/device.dart';
import '../models/message.dart';
import '../services/ws_service.dart';
import 'auth_provider.dart';

/// WebSocket 服务 Provider (单例)
final wsServiceProvider = Provider<WsService>((ref) {
  final ws = WsService();
  ref.onDispose(() => ws.dispose());
  return ws;
});

/// WS 连接状态
final wsConnectedProvider = StateProvider<bool>((ref) => false);

/// 设备列表 Provider
final deviceListProvider = StateNotifierProvider<DeviceListNotifier, List<Device>>((ref) {
  return DeviceListNotifier(ref);
});

/// 当前选中设备
final selectedDeviceProvider = StateProvider<String?>((ref) => null);

class DeviceListNotifier extends StateNotifier<List<Device>> {
  final Ref _ref;
  Timer? _reconnectTimer;
  Timer? _heartbeatPollTimer;

  DeviceListNotifier(this._ref) : super([]) {
    _listenWs();
    _listenAuth();
  }

  /// 监听认证状态 → 登录后自动连接 WS
  void _listenAuth() {
    _ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isLoggedIn && !(previous?.isLoggedIn ?? false)) {
        // 登录成功，尝试连接
        _autoConnect();
      } else if (!next.isLoggedIn) {
        // 退出登录，断开
        final ws = _ref.read(wsServiceProvider);
        ws.disconnect();
        _ref.read(wsConnectedProvider.notifier).state = false;
        _reconnectTimer?.cancel();
        _heartbeatPollTimer?.cancel();
        state = [];
      }
    });

    // 如果已经登录，立即尝试连接
    final auth = _ref.read(authProvider);
    if (auth.isLoggedIn) {
      _autoConnect();
    }
  }

  /// 自动连接 WS（先尝试局域网，再尝试云端中继）
  Future<void> _autoConnect() async {
    final ws = _ref.read(wsServiceProvider);

    // 尝试常见局域网 IP
    final localIps = ['192.168.1.100', '192.168.0.100', '192.168.1.101', '10.0.0.100'];

    for (final ip in localIps) {
      try {
        final success = await ws.connectDirect(ip).timeout(
          const Duration(seconds: 2),
          onTimeout: () => false,
        );
        if (success) {
          print('[WS] 局域网连接成功: $ip');
          _ref.read(wsConnectedProvider.notifier).state = true;
          _startHeartbeatPolling();
          return;
        }
      } catch (_) {}
    }

    // 局域网失败后，尝试云端中继
    try {
      final success = await ws.connectDirect('bt.aacc.fun', port: 19527).timeout(
        const Duration(seconds: 5),
        onTimeout: () => false,
      );
      if (success) {
        print('[WS] 云端中继连接成功');
        _ref.read(wsConnectedProvider.notifier).state = true;
        _startHeartbeatPolling();
        return;
      }
    } catch (_) {}

    print('[WS] 所有连接失败，将在 30 秒后重试');
    _ref.read(wsConnectedProvider.notifier).state = false;

    // 设置退避重连
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 30), () => _autoConnect());
  }

  /// 定期发送心跳获取设备数据
  void _startHeartbeatPolling() {
    _heartbeatPollTimer?.cancel();
    _heartbeatPollTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      final ws = _ref.read(wsServiceProvider);
      if (ws.isConnected) {
        ws.send(WsMessage(type: 'ping'));
      } else {
        _ref.read(wsConnectedProvider.notifier).state = false;
        _heartbeatPollTimer?.cancel();
        // 尝试重连
        _reconnectTimer?.cancel();
        _reconnectTimer = Timer(const Duration(seconds: 5), () => _autoConnect());
      }
    });
  }

  void _listenWs() {
    final ws = _ref.read(wsServiceProvider);
    ws.messages.listen((msg) {
      switch (msg.type) {
        case 'connected':
          // 电脑发来的欢迎消息，包含平台信息
          _handleConnected(msg.data);
          break;
        case 'heartbeat':
          _handleHeartbeat(msg.data);
          break;
        case 'device_list':
          _handleDeviceList(msg.data);
          break;
      }
    });
  }

  void _handleConnected(Map<String, dynamic> data) {
    final platform = data['platform'] as String? ?? 'unknown';
    final version = data['version'] as String? ?? '';
    print('[WS] 电脑已连接: $platform v$version');

    // 创建当前连接的设备
    final device = Device(
      id: 'connected_pc',
      name: _ref.read(authProvider).email ?? '我的电脑',
      platform: platform == 'macos' ? 'macos' : 'windows',
      online: true,
      commMode: CommMode.wifi,
      cpu: 0,
      memory: 0,
    );

    // 检查是否已存在
    final existing = state.indexWhere((d) => d.id == 'connected_pc');
    if (existing >= 0) {
      state = [...state]..[existing] = device;
    } else {
      state = [...state, device];
    }
  }

  void _handleHeartbeat(Map<String, dynamic> data) {
    final deviceId = data['device_id'] as String? ?? 'connected_pc';
    final deviceName = data['device_name'] as String? ?? '我的电脑';
    final cpu = (data['cpu'] ?? 0).toDouble();
    final cpuTemp = (data['cpu_temp'] ?? 0).toDouble();
    final memory = (data['memory'] ?? 0).toDouble();
    final memoryUsed = (data['memory_used'] ?? 0).toDouble();
    final memoryTotal = (data['memory_total'] ?? 0).toDouble();
    final disk = (data['disk'] ?? 0).toDouble();
    final diskUsed = (data['disk_used'] ?? 0).toDouble();
    final diskTotal = (data['disk_total'] ?? 0).toDouble();
    final tasksRunning = data['tasks_running'] as int? ?? 0;
    final hostname = data['hostname'] as String? ?? '';
    final osVersion = data['os_version'] as String? ?? '';

    final index = state.indexWhere((d) => d.id == deviceId);
    if (index >= 0) {
      final updated = state[index].copyWith(
        name: deviceName.isNotEmpty ? deviceName : null,
        hostname: hostname.isNotEmpty ? hostname : null,
        osVersion: osVersion.isNotEmpty ? osVersion : null,
        online: true,
        cpu: cpu,
        cpuTemp: cpuTemp,
        memory: memory,
        memoryUsed: memoryUsed,
        memoryTotal: memoryTotal,
        disk: disk,
        diskUsed: diskUsed,
        diskTotal: diskTotal,
        tasksRunning: tasksRunning,
      );
      state = [...state]..[index] = updated;
    } else {
      // 新设备
      state = [...state, Device(
        id: deviceId,
        name: deviceName,
        hostname: hostname,
        osVersion: osVersion,
        platform: 'unknown',
        online: true,
        commMode: CommMode.wifi,
        cpu: cpu,
        memory: memory,
        tasksRunning: tasksRunning,
      )];
    }
  }

  void _handleDeviceList(Map<String, dynamic> data) {
    final devices = (data['devices'] as List?)
        ?.map((d) => Device.fromJson(d))
        .toList() ?? [];
    state = devices;
  }

  void addDevice(Device device) {
    state = [...state, device];
  }

  void removeDevice(String deviceId) {
    state = state.where((d) => d.id != deviceId).toList();
  }

  void setDeviceOffline(String deviceId) {
    final index = state.indexWhere((d) => d.id == deviceId);
    if (index >= 0) {
      state = [...state]..[index] = state[index].copyWith(online: false, commMode: CommMode.offline);
    }
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _heartbeatPollTimer?.cancel();
    super.dispose();
  }
}

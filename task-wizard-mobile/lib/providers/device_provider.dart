import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../models/device.dart';
import '../models/message.dart';
import '../services/ws_service.dart';
import 'auth_provider.dart';

/// WebSocket 服务 Provider (单例，用于 AI 指令中转)
final wsServiceProvider = Provider<WsService>((ref) {
  final ws = WsService();
  ref.onDispose(() => ws.dispose());
  return ws;
});

/// WS 连接状态
final wsConnectedProvider = StateProvider<bool>((ref) => false);

/// 设备列表 Provider — 从服务器 API 获取真实数据
final deviceListProvider = StateNotifierProvider<DeviceListNotifier, List<Device>>((ref) {
  return DeviceListNotifier(ref);
});

/// 当前选中设备
final selectedDeviceProvider = StateProvider<String?>((ref) => null);

class DeviceListNotifier extends StateNotifier<List<Device>> {
  final Ref _ref;
  Timer? _pollTimer;

  static const _serverUrl = 'https://bt.aacc.fun:8888/api/devices';

  DeviceListNotifier(this._ref) : super([]) {
    _listenAuth();
  }

  /// 监听认证状态 → 登录后自动拉取设备列表
  void _listenAuth() {
    _ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isLoggedIn && !(previous?.isLoggedIn ?? false)) {
        // 登录成功，开始拉取
        _startPolling();
      } else if (!next.isLoggedIn) {
        // 退出登录
        _pollTimer?.cancel();
        state = [];
      }
    });

    // 如果已经登录，立即拉取
    final auth = _ref.read(authProvider);
    if (auth.isLoggedIn) {
      _startPolling();
    }
  }

  /// 启动轮询：立即拉取 + 每15秒刷新
  void _startPolling() {
    _fetchDevices();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _fetchDevices();
    });
  }

  /// 从服务器 API 拉取设备列表
  Future<void> _fetchDevices() async {
    final token = _ref.read(authProvider).token;
    if (token == null || token.isEmpty) return;

    try {
      final resp = await http.get(
        Uri.parse(_serverUrl),
        headers: {'Authorization': 'Bearer $token'},
      ).timeout(const Duration(seconds: 10));

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        final devicesList = data['devices'] as List? ?? [];

        final devices = devicesList.map<Device>((d) {
          final map = d as Map<String, dynamic>;
          return Device(
            id: map['device_id']?.toString() ?? '',
            name: map['name']?.toString() ?? '',
            hostname: map['hostname']?.toString() ?? '',
            platform: map['platform']?.toString() ?? 'unknown',
            osVersion: map['os_version']?.toString() ?? '',
            online: (map['online'] ?? 0) == 1,
            commMode: (map['online'] ?? 0) == 1 ? CommMode.wifi : CommMode.offline,
            cpu: (map['cpu'] ?? 0).toDouble(),
            cpuTemp: (map['cpu_temp'] ?? 0).toDouble(),
            memory: (map['memory'] ?? 0).toDouble(),
            memoryUsed: (map['memory_used'] ?? 0).toDouble(),
            memoryTotal: (map['memory_total'] ?? 0).toDouble(),
            disk: (map['disk'] ?? 0).toDouble(),
            diskUsed: (map['disk_used'] ?? 0).toDouble(),
            diskTotal: (map['disk_total'] ?? 0).toDouble(),
            tasksRunning: (map['tasks_running'] ?? 0) as int,
          );
        }).toList();

        state = devices;
        print('[devices] 从服务器获取 ${devices.length} 台设备');
      } else {
        print('[devices] API 错误: ${resp.statusCode}');
      }
    } catch (e) {
      print('[devices] 网络错误: $e');
    }
  }

  void addDevice(Device device) {
    state = [...state, device];
  }

  void removeDevice(String deviceId) {
    state = state.where((d) => d.id != deviceId).toList();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}

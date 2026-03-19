import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../models/device.dart';
import '../models/message.dart';
import '../services/ws_service.dart';
import 'auth_provider.dart';

/// WebSocket 服务 Provider (单例)
final wsServiceProvider = Provider<WsService>((ref) {
  final ws = WsService();
  ref.onDispose(() => ws.dispose());

  // 监听认证状态 → 登录后自动连接 WS 中继
  ref.listen<AuthState>(authProvider, (previous, next) {
    if (next.isLoggedIn && next.token != null && next.token!.isNotEmpty) {
      if (!(previous?.isLoggedIn ?? false)) {
        ws.connectRelay(next.token!);
        print('[WS] 自动连接中继服务器');
      }
    } else {
      ws.disconnect(autoReconnect: false);
      print('[WS] 已断开');
    }
  });

  // 如果已经登录，立即连接
  final auth = ref.read(authProvider);
  if (auth.isLoggedIn && auth.token != null) {
    ws.connectRelay(auth.token!);
  }

  return ws;
});

/// WS 连接状态
final wsConnectedProvider = StreamProvider<bool>((ref) {
  final ws = ref.watch(wsServiceProvider);
  return ws.connectionStatus;
});

/// WS 消息流
final wsMessagesProvider = StreamProvider<WsMessage>((ref) {
  final ws = ref.watch(wsServiceProvider);
  return ws.messages;
});

/// 设备列表 Provider — 从服务器 API 获取真实数据
final deviceListProvider = StateNotifierProvider<DeviceListNotifier, List<Device>>((ref) {
  return DeviceListNotifier(ref);
});

/// 当前选中设备
final selectedDeviceProvider = StateProvider<String?>((ref) => null);

class DeviceListNotifier extends StateNotifier<List<Device>> {
  final Ref _ref;
  Timer? _pollTimer;
  StreamSubscription? _wsSub;

  static const _serverUrl = 'https://bt.aacc.fun:8888/api/devices';

  DeviceListNotifier(this._ref) : super([]) {
    _listenAuth();
    _listenWsEvents();
  }

  /// 监听认证状态 → 登录后自动拉取设备列表
  void _listenAuth() {
    _ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.isLoggedIn && !(previous?.isLoggedIn ?? false)) {
        _startPolling();
      } else if (!next.isLoggedIn) {
        _pollTimer?.cancel();
        state = [];
      }
    });

    final auth = _ref.read(authProvider);
    if (auth.isLoggedIn) {
      _startPolling();
    }
  }

  /// 监听 WS 实时事件（PC 上/下线）
  void _listenWsEvents() {
    final ws = _ref.read(wsServiceProvider);
    _wsSub = ws.messages.listen((msg) {
      if (msg.type == 'pc_online') {
        // PC 上线 → 立即刷新列表
        _fetchDevices();
      } else if (msg.type == 'pc_offline') {
        // PC 下线 → 更新对应设备状态
        final deviceId = msg.data?['device_id'];
        if (deviceId != null) {
          state = state.map((d) {
            if (d.id == deviceId) {
              return Device(
                id: d.id, name: d.name, hostname: d.hostname,
                platform: d.platform, osVersion: d.osVersion,
                online: false, commMode: CommMode.offline,
                cpu: 0, cpuTemp: 0, memory: 0,
                memoryUsed: d.memoryUsed, memoryTotal: d.memoryTotal,
                disk: d.disk, diskUsed: d.diskUsed, diskTotal: d.diskTotal,
                tasksRunning: 0,
              );
            }
            return d;
          }).toList();
        }
      } else if (msg.type == 'online_pcs') {
        // 认证后服务器返回在线 PC 列表 → 刷新
        _fetchDevices();
      }
    });
  }

  /// 启动轮询：立即拉取 + 每30秒刷新
  void _startPolling() {
    _fetchDevices();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
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
    _wsSub?.cancel();
    super.dispose();
  }
}

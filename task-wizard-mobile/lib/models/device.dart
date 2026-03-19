/// 设备模型 — 一个账号绑定的电脑（最多100台）
enum CommMode { wifi, bluetooth, wifiDirect, cloud, offline }

class Device {
  final String id;
  final String name;
  final String hostname;
  final String platform; // macos, windows, linux
  final String osVersion;
  final String ip;
  final bool online;
  final CommMode commMode;
  final double cpu;
  final double cpuTemp; // °C
  final double memory; // 使用率 %
  final double memoryUsed; // 已用 GB
  final double memoryTotal; // 总量 GB
  final double disk; // 使用率 %
  final double diskUsed; // 已用 GB
  final double diskTotal; // 总量 GB
  final int tasksRunning;
  final DateTime lastSeen;

  Device({
    required this.id,
    required this.name,
    this.hostname = '',
    this.platform = 'macos',
    this.osVersion = '',
    this.ip = '',
    this.online = false,
    this.commMode = CommMode.offline,
    this.cpu = 0,
    this.cpuTemp = 0,
    this.memory = 0,
    this.memoryUsed = 0,
    this.memoryTotal = 0,
    this.disk = 0,
    this.diskUsed = 0,
    this.diskTotal = 0,
    this.tasksRunning = 0,
    DateTime? lastSeen,
  }) : lastSeen = lastSeen ?? DateTime.now();

  factory Device.fromJson(Map<String, dynamic> json) => Device(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    hostname: json['hostname'] ?? '',
    platform: json['platform'] ?? 'macos',
    osVersion: json['os_version'] ?? '',
    ip: json['ip'] ?? '',
    online: json['online'] ?? false,
    commMode: CommMode.values.firstWhere(
      (m) => m.name == json['comm_mode'],
      orElse: () => CommMode.offline,
    ),
    cpu: (json['cpu'] ?? 0).toDouble(),
    cpuTemp: (json['cpu_temp'] ?? 0).toDouble(),
    memory: (json['memory'] ?? 0).toDouble(),
    memoryUsed: (json['memory_used'] ?? 0).toDouble(),
    memoryTotal: (json['memory_total'] ?? 0).toDouble(),
    disk: (json['disk'] ?? 0).toDouble(),
    diskUsed: (json['disk_used'] ?? 0).toDouble(),
    diskTotal: (json['disk_total'] ?? 0).toDouble(),
    tasksRunning: json['tasks_running'] ?? 0,
  );

  Device copyWith({
    String? name,
    String? hostname,
    String? osVersion,
    bool? online,
    CommMode? commMode,
    double? cpu,
    double? cpuTemp,
    double? memory,
    double? memoryUsed,
    double? memoryTotal,
    double? disk,
    double? diskUsed,
    double? diskTotal,
    int? tasksRunning,
  }) => Device(
    id: id, name: name ?? this.name, hostname: hostname ?? this.hostname,
    platform: platform, osVersion: osVersion ?? this.osVersion, ip: ip,
    online: online ?? this.online,
    commMode: commMode ?? this.commMode,
    cpu: cpu ?? this.cpu,
    cpuTemp: cpuTemp ?? this.cpuTemp,
    memory: memory ?? this.memory,
    memoryUsed: memoryUsed ?? this.memoryUsed,
    memoryTotal: memoryTotal ?? this.memoryTotal,
    disk: disk ?? this.disk,
    diskUsed: diskUsed ?? this.diskUsed,
    diskTotal: diskTotal ?? this.diskTotal,
    tasksRunning: tasksRunning ?? this.tasksRunning,
    lastSeen: DateTime.now(),
  );

  String get commIcon {
    switch (commMode) {
      case CommMode.wifi: return '🟢';
      case CommMode.bluetooth: return '🟠';
      case CommMode.wifiDirect: return '🟣';
      case CommMode.cloud: return '☁️';
      case CommMode.offline: return '⚪';
    }
  }

  String get commLabel {
    switch (commMode) {
      case CommMode.wifi: return 'WiFi';
      case CommMode.bluetooth: return '蓝牙';
      case CommMode.wifiDirect: return 'WiFi Direct';
      case CommMode.cloud: return '云端';
      case CommMode.offline: return '离线';
    }
  }

  String get platformIcon {
    switch (platform) {
      case 'macos': return '🍎';
      case 'windows': return '🪟';
      case 'linux': return '🐧';
      default: return '💻';
    }
  }

  /// 格式化内存显示：2.6 GB / 31.2 GB
  String get memoryDisplay {
    if (memoryTotal > 0) {
      return '${memoryUsed.toStringAsFixed(1)} GB / ${memoryTotal.toStringAsFixed(1)} GB';
    }
    return '${memory.toInt()}%';
  }

  /// 格式化硬盘显示：120 GB / 500 GB
  String get diskDisplay {
    if (diskTotal > 0) {
      return '${diskUsed.toStringAsFixed(0)} GB / ${diskTotal.toStringAsFixed(0)} GB';
    }
    return '${disk.toInt()}%';
  }
}

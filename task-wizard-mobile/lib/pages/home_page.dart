import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../models/device.dart';
import '../providers/device_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/device_card.dart';
import '../widgets/stat_card.dart';
import 'dart:math' as math;

/// 🏠 首页 — 设备概览 + 圆环统计 + 时间线记录
class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final devices = ref.watch(deviceListProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final allDevices = devices;

    // 首页最多显示5台设备
    final homeDevices = allDevices.length > 5 ? allDevices.sublist(0, 5) : allDevices;
    final onlineCount = allDevices.where((d) => d.online).length;

    // 取第一个在线设备的状态数据（无设备时用默认值）
    final activeDevice = allDevices.isNotEmpty
      ? allDevices.firstWhere((d) => d.online, orElse: () => allDevices.first)
      : null;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ===== 顶部：标题 + 通知 =====
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l.appTitle,
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppTheme.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: AppTheme.cardShadowSmall,
                    ),
                    child: Icon(
                      Icons.notifications_none_rounded,
                      color: isDark ? Colors.white70 : AppTheme.textSecondary,
                      size: 22,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ===== 搜索栏 =====
              Container(
                height: 48,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: AppTheme.cardShadowSmall,
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 16),
                    Icon(Icons.search_rounded, size: 20, color: AppTheme.textHint),
                    const SizedBox(width: 10),
                    Text(l.search, style: TextStyle(fontSize: 14, color: AppTheme.textHint)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ===== 1. 我的设备 =====
              _sectionTitle(
                l.myDevices,
                '$onlineCount${l.isZh ? "台在线" : " online"} · ${allDevices.length}${l.isZh ? "台" : ""}',
                isDark,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _DevicesListPage(devices: allDevices),
                )),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 138,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: homeDevices.length + (allDevices.length > 5 ? 1 : 0),
                  separatorBuilder: (_, __) => const SizedBox(width: 14),
                  itemBuilder: (context, index) {
                    if (index < homeDevices.length) {
                      return GestureDetector(
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => _DeviceDetailPage(device: homeDevices[index]),
                        )),
                        child: DeviceCard(device: homeDevices[index]),
                      );
                    }
                    return _buildViewMoreCard(allDevices.length, isDark, l, () {
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => _DevicesListPage(devices: allDevices),
                      ));
                    });
                  },
                ),
              ),
              const SizedBox(height: 28),

              // ===== 2. 设备状态 (原电脑状态) =====
              _sectionTitle(
                l.deviceStatus, '',
                isDark,
                onTap: activeDevice != null ? () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _DeviceDetailPage(device: activeDevice),
                )) : null,
              ),
              const SizedBox(height: 12),
              if (activeDevice != null)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Row(
                  children: [
                    Expanded(child: _buildCircularProgress(
                      l.cpuUsage,
                      activeDevice.cpu / 100,
                      AppTheme.primaryBlue,
                      isDark,
                      subtitle: activeDevice.cpuTemp > 0 ? '${activeDevice.cpuTemp.toInt()}°C' : null,
                    )),
                    Expanded(child: _buildCircularProgress(
                      l.memoryLabel,
                      activeDevice.memory / 100,
                      const Color(0xFF8B5CF6),
                      isDark,
                      subtitle: activeDevice.memoryTotal > 0
                        ? '${activeDevice.memoryUsed.toStringAsFixed(1)}/${activeDevice.memoryTotal.toStringAsFixed(0)}GB'
                        : null,
                    )),
                    Expanded(child: _buildCircularProgress(
                      l.diskLabel,
                      activeDevice.disk / 100,
                      AppTheme.warningOrange,
                      isDark,
                      subtitle: activeDevice.diskTotal > 0
                        ? '${activeDevice.diskUsed.toStringAsFixed(0)}/${activeDevice.diskTotal.toStringAsFixed(0)}GB'
                        : null,
                    )),
                  ],
                ),
              )
              else
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.computer_outlined, size: 48, color: isDark ? Colors.white30 : const Color(0xFFD1D5DB)),
                      const SizedBox(height: 12),
                      Text(
                        '${l.noDevices}\n${l.isZh ? "请先在电脑端登录任务精灵" : "Please login on PC first"}',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : AppTheme.textHint, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ===== 3. 任务概览 (真实数据) =====
              _sectionTitle(
                l.taskOverview, '',
                isDark,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _TaskOverviewPage(),
                )),
              ),
              const SizedBox(height: 12),
              _TaskSummaryRow(isDark: isDark),
              const SizedBox(height: 28),

              // ===== 4. 最近记录 (真实数据) =====
              _sectionTitle(
                l.recentActivity,
                l.viewAll,
                isDark,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _ActivityLogPage(),
                )),
              ),
              const SizedBox(height: 12),
              _ActivityLogSection(isDark: isDark),
            ],
          ),
        ),
      ),
    );
  }


  Widget _buildViewMoreCard(int totalCount, bool isDark, AppLocalizations l, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: AppTheme.cardShadow,
          border: Border.all(color: AppTheme.primaryBlue.withOpacity(0.15), width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.devices_other_rounded, size: 22, color: AppTheme.primaryBlue),
            ),
            const SizedBox(height: 10),
            Text(
              l.viewMore,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryBlue,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$totalCount/100 ${l.isZh ? "台" : ""}',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.white38 : AppTheme.textHint,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title, String trailing, bool isDark, {VoidCallback? onTap}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : AppTheme.textPrimary,
            letterSpacing: -0.2,
          ),
        ),
        if (trailing.isNotEmpty)
          GestureDetector(
            onTap: onTap,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  trailing,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.primaryBlue,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (onTap != null) ...[
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.primaryBlue),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildCircularProgress(String label, double value, Color color, bool isDark, {String? subtitle}) {
    return Column(
      children: [
        SizedBox(
          width: 72, height: 72,
          child: CustomPaint(
            painter: _CircularProgressPainter(
              value: value,
              color: color,
              backgroundColor: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFF0F1F5),
              strokeWidth: 7,
            ),
            child: Center(
              child: Text(
                '${(value * 100).toInt()}%',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppTheme.textPrimary,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? Colors.white60 : AppTheme.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10,
              color: isDark ? Colors.white30 : AppTheme.textHint,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildTimelineItem(String time, String text, IconData icon, Color color, bool isDark, {bool isFirst = false, bool isLast = false}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                if (!isFirst)
                  Expanded(
                    child: Container(width: 2, color: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE8EBF5)),
                  ),
                Container(
                  width: 10, height: 10,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 6, spreadRadius: 1)],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE8EBF5)),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Row(
                children: [
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, size: 16, color: color),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      text,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  Text(
                    time,
                    style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 圆环进度自定义画笔
class _CircularProgressPainter extends CustomPainter {
  final double value;
  final Color color;
  final Color backgroundColor;
  final double strokeWidth;

  _CircularProgressPainter({
    required this.value,
    required this.color,
    required this.backgroundColor,
    this.strokeWidth = 6,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, bgPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * value,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _CircularProgressPainter oldDelegate) =>
      value != oldDelegate.value || color != oldDelegate.color;
}

// ================================================================
// 真实数据组件
// ================================================================

/// 任务概览 — 从服务器 API 获取真实数据
class _TaskSummaryRow extends ConsumerStatefulWidget {
  final bool isDark;
  const _TaskSummaryRow({required this.isDark});

  @override
  ConsumerState<_TaskSummaryRow> createState() => _TaskSummaryRowState();
}

class _TaskSummaryRowState extends ConsumerState<_TaskSummaryRow> {
  int _running = 0, _completed = 0, _pending = 0;

  @override
  void initState() {
    super.initState();
    _fetchSummary();
  }

  Future<void> _fetchSummary() async {
    final token = ref.read(authProvider).token;
    if (token == null) return;
    try {
      final data = await ApiService.getTaskSummary(token);
      if (mounted) {
        setState(() {
          _running = data['running'] ?? 0;
          _completed = data['completed'] ?? 0;
          _pending = data['pending'] ?? 0;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Row(
      children: [
        Expanded(child: StatCard(label: l.running, value: '$_running', color: AppTheme.successGreen, icon: Icons.play_circle_outline)),
        const SizedBox(width: 12),
        Expanded(child: StatCard(label: l.completed, value: '$_completed', color: AppTheme.primaryBlue, icon: Icons.check_circle_outline)),
        const SizedBox(width: 12),
        Expanded(child: StatCard(label: l.pending, value: '$_pending', color: AppTheme.warningOrange, icon: Icons.schedule_rounded)),
      ],
    );
  }
}

/// 最近记录 — 从服务器 API 获取真实数据
class _ActivityLogSection extends ConsumerStatefulWidget {
  final bool isDark;
  const _ActivityLogSection({required this.isDark});

  @override
  ConsumerState<_ActivityLogSection> createState() => _ActivityLogSectionState();
}

class _ActivityLogSectionState extends ConsumerState<_ActivityLogSection> {
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    final token = ref.read(authProvider).token;
    if (token == null) return;
    try {
      final data = await ApiService.getActivityLog(token, limit: 5);
      if (mounted) {
        setState(() {
          _logs = List<Map<String, dynamic>>.from(data['logs'] ?? []);
        });
      }
    } catch (_) {}
  }

  IconData _actionIcon(String action) {
    switch (action) {
      case 'task_complete': return Icons.check_circle_rounded;
      case 'task_start': return Icons.play_circle_rounded;
      case 'task_error': return Icons.error_rounded;
      case 'app_launch': return Icons.apps_rounded;
      case 'script_exec': return Icons.code_rounded;
      default: return Icons.info_rounded;
    }
  }

  Color _actionColor(String status) {
    switch (status) {
      case 'success': return AppTheme.successGreen;
      case 'error': return const Color(0xFFEF4444);
      case 'warning': return AppTheme.warningOrange;
      default: return AppTheme.primaryBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final l = AppLocalizations.of(context);

    if (_logs.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.event_note_rounded, size: 40, color: isDark ? Colors.white24 : const Color(0xFFD1D5DB)),
              const SizedBox(height: 10),
              Text(l.noRecords, style: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : AppTheme.textHint)),
            ],
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        children: _logs.asMap().entries.map((e) {
          final i = e.key;
          final log = e.value;
          final action = log['action'] ?? '';
          final status = log['status'] ?? 'success';
          final detail = log['detail'] ?? action;
          final time = (log['created_at'] ?? '').toString();
          final timeStr = time.length >= 16 ? time.substring(11, 16) : time;
          final color = _actionColor(status);
          final icon = _actionIcon(action);

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  child: Column(
                    children: [
                      if (i > 0) Expanded(child: Container(width: 2, color: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE8EBF5))),
                      Container(
                        width: 10, height: 10,
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 6, spreadRadius: 1)]),
                      ),
                      if (i < _logs.length - 1) Expanded(child: Container(width: 2, color: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE8EBF5))),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      children: [
                        Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                          child: Icon(icon, size: 16, color: color),
                        ),
                        const SizedBox(width: 10),
                        Expanded(child: Text(detail, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary))),
                        Text(timeStr, style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ================================================================
// 以下是二级页面
// ================================================================

/// 设备列表页 — X/100 台
class _DevicesListPage extends StatelessWidget {
  final List<Device> devices;
  const _DevicesListPage({required this.devices});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);
    final onlineCount = devices.where((d) => d.online).length;

    return Scaffold(
      appBar: AppBar(
        title: Text(l.myDevices),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: AppTheme.gradientPrimary,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.devices_rounded, color: Colors.white, size: 22),
                const SizedBox(width: 12),
                Text(
                  '$onlineCount ${l.onlineCount} · ${devices.length}/100',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const Spacer(),
                Text(
                  '${l.isZh ? "剩余" : "Remaining"} ${100 - devices.length}',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              itemCount: devices.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final d = devices[index];
                return GestureDetector(
                  onTap: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => _DeviceDetailPage(device: d),
                  )),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: AppTheme.cardShadowSmall,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(
                            color: (d.online ? AppTheme.successGreen : AppTheme.textHint).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(child: Text(d.platformIcon, style: const TextStyle(fontSize: 22))),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(d.name, style: TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : AppTheme.textPrimary,
                              )),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    width: 8, height: 8,
                                    decoration: BoxDecoration(
                                      color: d.online ? AppTheme.successGreen : const Color(0xFFD1D5DB),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    d.online ? d.commLabel : l.deviceOffline,
                                    style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint),
                                  ),
                                  if (d.online) ...[
                                    const SizedBox(width: 12),
                                    Text('CPU ${d.cpu.toInt()}%', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                                    const SizedBox(width: 8),
                                    Text('${l.memoryLabel} ${d.memory.toInt()}%', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: isDark ? Colors.white24 : const Color(0xFFD0D5E0)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// 设备详情页
class _DeviceDetailPage extends StatelessWidget {
  final Device device;
  const _DeviceDetailPage({required this.device});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(device.name), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: _statusCard(
                  'CPU', device.cpu,
                  AppTheme.primaryBlue,
                  subtitle: device.cpuTemp > 0 ? '${l.temperature} ${device.cpuTemp.toInt()}°C' : null,
                  detail: '${l.utilization} ${device.cpu.toInt()}%',
                  isDark: isDark,
                )),
                const SizedBox(width: 14),
                Expanded(child: _statusCard(
                  l.memoryLabel, device.memory,
                  const Color(0xFF8B5CF6),
                  subtitle: device.memoryTotal > 0 ? device.memoryDisplay : null,
                  detail: '${device.memory.toInt()}%',
                  isDark: isDark,
                  showCircle: true,
                )),
              ],
            ),
            const SizedBox(height: 16),
            _sectionCard(
              title: l.diskLabel,
              isDark: isDark,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(l.total, style: TextStyle(color: isDark ? Colors.white54 : AppTheme.textSecondary, fontSize: 13)),
                      Text(device.diskTotal > 0 ? device.diskDisplay : '${device.disk.toInt()}%',
                        style: TextStyle(fontWeight: FontWeight.w600, color: isDark ? Colors.white : AppTheme.textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: device.disk / 100,
                      minHeight: 8,
                      backgroundColor: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFF0F1F5),
                      valueColor: const AlwaysStoppedAnimation(AppTheme.warningOrange),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _sectionCard(
              title: l.isZh ? '设备信息' : 'Device Info',
              isDark: isDark,
              child: Column(
                children: [
                  _infoRow(l.isZh ? '平台' : 'Platform', device.platform == 'macos' ? 'macOS' : 'Windows', isDark),
                  _infoRow(l.isZh ? '状态' : 'Status', device.online ? '${l.deviceOnline} (${device.commLabel})' : l.deviceOffline, isDark),
                  if (device.osVersion.isNotEmpty)
                    _infoRow(l.isZh ? '系统版本' : 'OS Version', device.osVersion, isDark),
                  _infoRow(l.isZh ? '运行任务' : 'Tasks', '${device.tasksRunning}', isDark),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusCard(String title, double value, Color color, {String? subtitle, String? detail, bool isDark = false, bool showCircle = false}) {
    return Container(
      padding: const EdgeInsets.all(16), height: 140,
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [color, color.withOpacity(0.8)]),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
          const Spacer(),
          if (subtitle != null) Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7))),
          const SizedBox(height: 4),
          Text(detail ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(value: value / 100, minHeight: 4, backgroundColor: Colors.white.withOpacity(0.2), valueColor: const AlwaysStoppedAnimation(Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _sectionCard({required String title, required bool isDark, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: isDark ? Colors.white : AppTheme.textPrimary)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: isDark ? Colors.white54 : AppTheme.textSecondary)),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? Colors.white : AppTheme.textPrimary)),
        ],
      ),
    );
  }
}

/// 任务概览页 — 真实数据
class _TaskOverviewPage extends ConsumerStatefulWidget {
  @override
  ConsumerState<_TaskOverviewPage> createState() => _TaskOverviewPageState();
}

class _TaskOverviewPageState extends ConsumerState<_TaskOverviewPage> {
  List<Map<String, dynamic>> _logs = [];

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    final token = ref.read(authProvider).token;
    if (token == null) return;
    try {
      final data = await ApiService.getActivityLog(token, limit: 100);
      if (mounted) setState(() => _logs = List<Map<String, dynamic>>.from(data['logs'] ?? []));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);
    final running = _logs.where((l) => l['action'] == 'task_start').toList();
    final completed = _logs.where((l) => l['action'] == 'task_complete').toList();
    final pending = _logs.where((l) => l['action'] == 'task_pending').toList();

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.taskOverview),
          centerTitle: true,
          bottom: TabBar(
            labelColor: AppTheme.primaryBlue,
            unselectedLabelColor: isDark ? Colors.white38 : AppTheme.textHint,
            indicatorColor: AppTheme.primaryBlue,
            tabs: [Tab(text: l.running), Tab(text: l.completed), Tab(text: l.pending)],
          ),
        ),
        body: TabBarView(
          children: [
            _buildTaskList(running, AppTheme.successGreen, isDark, l),
            _buildTaskList(completed, AppTheme.primaryBlue, isDark, l),
            _buildTaskList(pending, AppTheme.warningOrange, isDark, l),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskList(List<Map<String, dynamic>> logs, Color color, bool isDark, AppLocalizations l) {
    if (logs.isEmpty) {
      return Center(child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.inbox_rounded, size: 56, color: isDark ? Colors.white24 : const Color(0xFFD1D5DB)),
          const SizedBox(height: 12),
          Text(l.noRecords, style: TextStyle(color: isDark ? Colors.white38 : AppTheme.textHint)),
        ],
      ));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: logs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final log = logs[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: AppTheme.cardShadowSmall,
          ),
          child: Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.task_alt_rounded, size: 20, color: color),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(log['detail'] ?? log['action'] ?? '', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: isDark ? Colors.white : AppTheme.textPrimary)),
                    const SizedBox(height: 4),
                    Text(log['device_name'] ?? '', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 活动日志页 — 真实数据
class _ActivityLogPage extends ConsumerStatefulWidget {
  @override
  ConsumerState<_ActivityLogPage> createState() => _ActivityLogPageState();
}

class _ActivityLogPageState extends ConsumerState<_ActivityLogPage> {
  List<Map<String, dynamic>> _logs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    final token = ref.read(authProvider).token;
    if (token == null) return;
    try {
      final data = await ApiService.getActivityLog(token, limit: 100);
      if (mounted) setState(() { _logs = List<Map<String, dynamic>>.from(data['logs'] ?? []); _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.activityLog), centerTitle: true),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _logs.isEmpty
          ? Center(child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.event_note_rounded, size: 56, color: isDark ? Colors.white24 : const Color(0xFFD1D5DB)),
                const SizedBox(height: 12),
                Text(l.noRecords, style: TextStyle(color: isDark ? Colors.white38 : AppTheme.textHint)),
              ],
            ))
          : ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: _logs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final log = _logs[index];
                final status = log['status'] ?? 'success';
                final color = status == 'success' ? AppTheme.successGreen
                    : status == 'error' ? const Color(0xFFEF4444)
                    : AppTheme.warningOrange;
                final time = (log['created_at'] ?? '').toString();
                final timeStr = time.length >= 16 ? time.substring(11, 16) : time;
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: AppTheme.cardShadowSmall,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                        child: Icon(
                          status == 'success' ? Icons.check_circle_rounded
                              : status == 'error' ? Icons.error_rounded
                              : Icons.warning_rounded,
                          size: 18, color: color,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(log['detail'] ?? log['action'] ?? '', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isDark ? Colors.white : AppTheme.textPrimary)),
                            if ((log['device_name'] ?? '').isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(log['device_name'], style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                            ],
                          ],
                        ),
                      ),
                      Text(timeStr, style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                    ],
                  ),
                );
              },
            ),
    );
  }

}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../models/device.dart';
import '../providers/device_provider.dart';
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

              // ===== 我的设备 =====
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
                    // "查看更多" 卡片
                    return _buildViewMoreCard(allDevices.length, isDark, l, () {
                      Navigator.push(context, MaterialPageRoute(
                        builder: (_) => _DevicesListPage(devices: allDevices),
                      ));
                    });
                  },
                ),
              ),
              const SizedBox(height: 28),

              // ===== 任务概览 =====
              _sectionTitle(
                l.taskOverview, '',
                isDark,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _TaskOverviewPage(),
                )),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: StatCard(label: l.running, value: '${activeDevice?.tasksRunning ?? 0}', color: AppTheme.successGreen, icon: Icons.play_circle_outline)),
                  const SizedBox(width: 12),
                  Expanded(child: StatCard(label: l.completed, value: '0', color: AppTheme.primaryBlue, icon: Icons.check_circle_outline)),
                  const SizedBox(width: 12),
                  Expanded(child: StatCard(label: l.pending, value: '0', color: AppTheme.warningOrange, icon: Icons.schedule_rounded)),
                ],
              ),
              const SizedBox(height: 28),

              // ===== 电脑状态 =====
              _sectionTitle(
                l.computerStatus, '',
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
                        '暂无设备连接\n请先在电脑端登录任务精灵',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: isDark ? Colors.white38 : AppTheme.textHint, height: 1.5),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ===== 最近记录 =====
              _sectionTitle(
                l.recentActivity,
                l.viewAll,
                isDark,
                onTap: () => Navigator.push(context, MaterialPageRoute(
                  builder: (_) => _ActivityLogPage(),
                )),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Column(
                  children: [
                    _buildTimelineItem('09:00', '电脑 → 打开微信', Icons.check_circle_rounded, AppTheme.successGreen, isDark, isFirst: true),
                    _buildTimelineItem('09:01', '电脑 → 需要手机扫码', Icons.warning_rounded, AppTheme.warningOrange, isDark),
                    _buildTimelineItem('09:01', '手机 → 自动打开微信扫码', Icons.phone_android_rounded, AppTheme.primaryBlue, isDark),
                    _buildTimelineItem('09:02', '授权完成', Icons.verified_rounded, AppTheme.successGreen, isDark, isLast: true),
                  ],
                ),
              ),
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
// 以下是二级页面占位实现（Batch C 会完善）
// ================================================================

/// 设备列表页 — X/100 台
class _DevicesListPage extends StatelessWidget {
  final List<Device> devices;
  const _DevicesListPage({required this.devices});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onlineCount = devices.where((d) => d.online).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的设备'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 统计条
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
                  '$onlineCount 台在线 · ${devices.length}/100 台',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                const Spacer(),
                Text(
                  '剩余 ${100 - devices.length} 台',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                ),
              ],
            ),
          ),
          // 设备列表
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
                                    d.online ? d.commLabel : '离线',
                                    style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint),
                                  ),
                                  if (d.online) ...[
                                    const SizedBox(width: 12),
                                    Text('CPU ${d.cpu.toInt()}%', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                                    const SizedBox(width: 8),
                                    Text('内存 ${d.memory.toInt()}%', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
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

/// 设备详情页 — 参考绿联云任务管理器
class _DeviceDetailPage extends StatelessWidget {
  final Device device;
  const _DeviceDetailPage({required this.device});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: Text(device.name), centerTitle: true),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // CPU + 内存 双卡片（参考绿联云风格）
            Row(
              children: [
                Expanded(child: _statusCard(
                  'CPU', device.cpu,
                  AppTheme.primaryBlue,
                  subtitle: device.cpuTemp > 0 ? '温度 ${device.cpuTemp.toInt()}°C' : null,
                  detail: '利用率 ${device.cpu.toInt()}%',
                  isDark: isDark,
                )),
                const SizedBox(width: 14),
                Expanded(child: _statusCard(
                  '内存', device.memory,
                  const Color(0xFF8B5CF6),
                  subtitle: device.memoryTotal > 0 ? device.memoryDisplay : null,
                  detail: '${device.memory.toInt()}%',
                  isDark: isDark,
                  showCircle: true,
                )),
              ],
            ),
            const SizedBox(height: 16),

            // 硬盘卡片
            _sectionCard(
              title: '硬盘',
              isDark: isDark,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('总计', style: TextStyle(color: isDark ? Colors.white54 : AppTheme.textSecondary, fontSize: 13)),
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

            // 设备信息卡片
            _sectionCard(
              title: '设备信息',
              isDark: isDark,
              child: Column(
                children: [
                  _infoRow('平台', device.platform == 'macos' ? 'macOS' : 'Windows', isDark),
                  _infoRow('状态', device.online ? '在线 (${device.commLabel})' : '离线', isDark),
                  if (device.osVersion.isNotEmpty)
                    _infoRow('系统版本', device.osVersion, isDark),
                  _infoRow('运行任务', '${device.tasksRunning} 个', isDark),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // 操作按钮
            _sectionCard(
              title: '远程操作',
              isDark: isDark,
              child: Row(
                children: [
                  _actionButton(Icons.folder_rounded, '文件浏览', const Color(0xFF14B8A6), isDark),
                  const SizedBox(width: 16),
                  _actionButton(Icons.computer_rounded, '远程启动', const Color(0xFF6366F1), isDark),
                  const SizedBox(width: 16),
                  _actionButton(Icons.code_rounded, '执行脚本', const Color(0xFF8B5CF6), isDark),
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
      padding: const EdgeInsets.all(16),
      height: 140,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, color.withOpacity(0.8)],
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
              const Icon(Icons.chevron_right_rounded, color: Colors.white70, size: 20),
            ],
          ),
          const Spacer(),
          if (subtitle != null)
            Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.7))),
          const SizedBox(height: 4),
          Text(detail ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: value / 100,
              minHeight: 4,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation(Colors.white),
            ),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : AppTheme.textPrimary,
              )),
              Icon(Icons.chevron_right_rounded, size: 20, color: isDark ? Colors.white24 : const Color(0xFFD0D5E0)),
            ],
          ),
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

  Widget _actionButton(IconData icon, String label, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            Icon(icon, size: 24, color: color),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ],
        ),
      ),
    );
  }
}

/// 任务概览页
class _TaskOverviewPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('任务概览'),
          centerTitle: true,
          bottom: TabBar(
            labelColor: AppTheme.primaryBlue,
            unselectedLabelColor: isDark ? Colors.white38 : AppTheme.textHint,
            indicatorColor: AppTheme.primaryBlue,
            tabs: const [
              Tab(text: '运行中'),
              Tab(text: '已完成'),
              Tab(text: '待执行'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildTaskList('running', isDark),
            _buildTaskList('completed', isDark),
            _buildTaskList('pending', isDark),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskList(String type, bool isDark) {
    final tasks = type == 'running'
        ? [('每天打开微信', '08:20', 'application'), ('微信自动打卡', '08:25', 'chain')]
        : type == 'completed'
            ? [('打开 Chrome', '09:00', 'application'), ('启动钉钉签到', '09:30', 'chain'), ('执行数据备份', '10:00', 'script'), ('打开飞书', '10:30', 'application'), ('执行日志清理', '11:00', 'script')]
            : [('关机', '23:00', 'script'), ('启动更新', '02:00', 'script'), ('打开邮件', '08:00', 'application')];

    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: tasks.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final (name, time, taskType) = tasks[index];
        final color = type == 'running' ? AppTheme.successGreen
            : type == 'completed' ? AppTheme.primaryBlue
            : AppTheme.warningOrange;
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
                child: Icon(
                  taskType == 'chain' ? Icons.link_rounded
                      : taskType == 'script' ? Icons.code_rounded
                      : Icons.apps_rounded,
                  size: 20, color: color,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: isDark ? Colors.white : AppTheme.textPrimary)),
                    const SizedBox(height: 4),
                    Text('每天 $time', style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  type == 'running' ? '运行中' : type == 'completed' ? '已完成' : '待执行',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// 活动日志页
class _ActivityLogPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final logs = [
      ('今天', [
        ('09:02', '授权完成', Icons.verified_rounded, AppTheme.successGreen),
        ('09:01', '手机 → 自动打开微信扫码', Icons.phone_android_rounded, AppTheme.primaryBlue),
        ('09:01', '电脑 → 需要手机扫码', Icons.warning_rounded, AppTheme.warningOrange),
        ('09:00', '电脑 → 打开微信', Icons.check_circle_rounded, AppTheme.successGreen),
      ]),
      ('昨天', [
        ('18:05', '执行关机脚本', Icons.power_settings_new_rounded, const Color(0xFFEF4444)),
        ('09:30', '钉钉自动签到完成', Icons.check_circle_rounded, AppTheme.successGreen),
        ('09:00', '打开钉钉', Icons.check_circle_rounded, AppTheme.successGreen),
      ]),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('活动日志'), centerTitle: true),
      body: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: logs.length,
        itemBuilder: (context, groupIndex) {
          final (date, items) = logs[groupIndex];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (groupIndex > 0) const SizedBox(height: 20),
              Text(date, style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600,
                color: isDark ? Colors.white54 : AppTheme.textSecondary,
              )),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: AppTheme.cardShadow,
                ),
                child: Column(
                  children: items.asMap().entries.map((entry) {
                    final i = entry.key;
                    final (time, text, icon, color) = entry.value;
                    return Padding(
                      padding: EdgeInsets.only(bottom: i < items.length - 1 ? 14 : 0),
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
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(text, style: TextStyle(
                              fontSize: 14, fontWeight: FontWeight.w500,
                              color: isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary,
                            )),
                          ),
                          Text(time, style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint)),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

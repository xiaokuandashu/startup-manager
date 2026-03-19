import 'package:flutter/material.dart';
import '../models/device.dart';
import '../theme/app_theme.dart';

/// 设备卡片 — 绿联云风格阴影卡片 + 状态发光点
class DeviceCard extends StatelessWidget {
  final Device device;
  const DeviceCard({super.key, required this.device});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isOnline = device.online;

    return Container(
      width: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: AppTheme.cardShadow,
        border: isOnline
          ? Border.all(color: AppTheme.successGreen.withOpacity(0.2), width: 1.5)
          : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 顶部：平台图标 + 名称
          Row(
            children: [
              // 平台图标背景
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: _platformBgColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(device.platformIcon, style: const TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  device.name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppTheme.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 状态行
          Row(
            children: [
              // 发光状态点
              Container(
                width: 8, height: 8,
                decoration: BoxDecoration(
                  color: isOnline ? AppTheme.successGreen : const Color(0xFFD1D5DB),
                  shape: BoxShape.circle,
                  boxShadow: isOnline ? [
                    BoxShadow(
                      color: AppTheme.successGreen.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 1,
                    ),
                  ] : null,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                isOnline ? device.commLabel : '离线',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isOnline ? AppTheme.successGreen : AppTheme.textHint,
                ),
              ),
            ],
          ),
          const Spacer(),

          // 底部信息
          if (isOnline) ...[
            Row(
              children: [
                _miniStat('CPU', '${device.cpu.toInt()}%', device.cpu / 100, AppTheme.primaryBlue, isDark),
                const SizedBox(width: 16),
                _miniStat('内存', device.memoryTotal > 0 ? '${device.memoryUsed.toStringAsFixed(1)}/${device.memoryTotal.toStringAsFixed(0)}G' : '${device.memory.toInt()}%', device.memory / 100, const Color(0xFF8B5CF6), isDark),
              ],
            ),
          ] else ...[
            Text(
              '上次在线: 2小时前',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? Colors.white30 : AppTheme.textHint,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color get _platformBgColor {
    switch (device.platform) {
      case 'macos': return const Color(0xFF6B7280);
      case 'windows': return AppTheme.primaryBlue;
      case 'linux': return const Color(0xFFF59E0B);
      default: return AppTheme.primaryBlue;
    }
  }

  Widget _miniStat(String label, String value, double progress, Color color, bool isDark) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: isDark ? Colors.white38 : AppTheme.textHint)),
              Text(value, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: isDark ? Colors.white70 : AppTheme.textPrimary)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 4,
              backgroundColor: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFF0F1F5),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
        ],
      ),
    );
  }
}

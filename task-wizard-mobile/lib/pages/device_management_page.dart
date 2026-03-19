import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../providers/device_provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../models/device.dart';

/// 设备管理二级页面 — 设备列表、数量、信息、退出登录
class DeviceManagementPage extends ConsumerWidget {
  const DeviceManagementPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l = AppLocalizations.of(context);
    final devices = ref.watch(deviceListProvider);
    final onlineCount = devices.where((d) => d.online).length;

    return Scaffold(
      appBar: AppBar(title: Text(l.deviceManagement), centerTitle: true),
      body: Column(
        children: [
          // 统计头部
          Container(
            margin: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: AppTheme.gradientPrimary,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${devices.length}/100',
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l.isZh ? '已注册设备' : 'Registered Devices',
                          style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.7)),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$onlineCount ${l.deviceOnline}',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: devices.length / 100,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    valueColor: const AlwaysStoppedAnimation(Colors.white),
                  ),
                ),
              ],
            ),
          ),

          // 设备列表
          Expanded(
            child: devices.isEmpty
              ? Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.devices_other_rounded, size: 56, color: isDark ? Colors.white24 : const Color(0xFFD1D5DB)),
                    const SizedBox(height: 12),
                    Text(l.noDevices, style: TextStyle(color: isDark ? Colors.white38 : AppTheme.textHint)),
                  ],
                ))
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  itemCount: devices.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final d = devices[index];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: AppTheme.cardShadowSmall,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
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
                                          d.online ? l.deviceOnline : l.deviceOffline,
                                          style: TextStyle(fontSize: 12, color: isDark ? Colors.white38 : AppTheme.textHint),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              // 退出/删除按钮
                              PopupMenuButton<String>(
                                icon: Icon(Icons.more_vert_rounded, color: isDark ? Colors.white38 : AppTheme.textHint),
                                onSelected: (val) {
                                  if (val == 'remove') {
                                    _confirmRemove(context, ref, d, l);
                                  }
                                },
                                itemBuilder: (_) => [
                                  PopupMenuItem(
                                    value: 'remove',
                                    child: Row(
                                      children: [
                                        const Icon(Icons.logout_rounded, size: 18, color: Color(0xFFEF4444)),
                                        const SizedBox(width: 8),
                                        Text(l.deviceLogout),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          // 设备信息
                          Wrap(
                            spacing: 16,
                            children: [
                              _infoChip(l.isZh ? '平台' : 'Platform', d.platform == 'macos' ? 'macOS' : 'Windows', isDark),
                              if (d.osVersion.isNotEmpty) _infoChip(l.isZh ? '系统' : 'OS', d.osVersion, isDark),
                              if (d.online) _infoChip('CPU', '${d.cpu.toInt()}%', isDark),
                              if (d.online) _infoChip(l.memoryLabel, '${d.memory.toInt()}%', isDark),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }

  Widget _infoChip(String label, String value, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFF5F6FA),
        borderRadius: BorderRadius.circular(6),
      ),
      child: RichText(
        text: TextSpan(
          style: TextStyle(fontSize: 11, color: isDark ? Colors.white54 : AppTheme.textSecondary),
          children: [
            TextSpan(text: '$label '),
            TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  void _confirmRemove(BuildContext context, WidgetRef ref, Device d, AppLocalizations l) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.deviceLogout),
        content: Text(l.deviceLogoutConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final token = ref.read(authProvider).token;
              if (token != null) {
                try {
                  await ApiService.deleteDevice(token, d.id);
                  ref.read(deviceListProvider.notifier).removeDevice(d.id);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${d.name} ${l.isZh ? "已移除" : "removed"}')));
                } catch (_) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('操作失败')));
                }
              }
            },
            child: Text(l.confirm, style: const TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );
  }
}

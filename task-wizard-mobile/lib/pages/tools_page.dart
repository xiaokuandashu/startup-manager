import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import '../widgets/tool_grid_item.dart';
import '../theme/app_theme.dart';

/// 后台运行工具
class _RunningTool {
  final String name;
  final String status;
  final Color color;
  final bool pinned;
  _RunningTool(this.name, this.status, this.color, {this.pinned = false});
}

/// 🛠 工具页 — 精美图标网格 + 分类筛选
class ToolsPage extends StatefulWidget {
  const ToolsPage({super.key});

  @override
  State<ToolsPage> createState() => _ToolsPageState();
}

class _ToolsPageState extends State<ToolsPage> {
  int _selectedCategory = 0;
  final List<_RunningTool> _runningTools = [
    _RunningTool('任务管理', '3个任务运行中', AppTheme.successGreen, pinned: true),
    _RunningTool('协同任务', '等待授权', AppTheme.warningOrange, pinned: true),
  ];

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final categories = l.isZh
      ? ['全部', '自动化', '远程控制', '管理']
      : ['All', 'Automation', 'Remote', 'Manage'];

    final tools = [
      _ToolDef(Icons.checklist_rounded, l.taskMgmt, const Color(0xFF22C55E), const Color(0xFF16A34A)),
      _ToolDef(Icons.flash_on_rounded, l.quickAction, const Color(0xFF4C6FFF), const Color(0xFF3B56CC)),
      _ToolDef(Icons.handshake_rounded, l.collaboration, const Color(0xFFFF9F43), const Color(0xFFE8872F)),
      _ToolDef(Icons.computer_rounded, l.remoteLaunch, const Color(0xFF6366F1), const Color(0xFF4F46E5)),
      _ToolDef(Icons.code_rounded, l.scriptExec, const Color(0xFF8B5CF6), const Color(0xFF7C3AED)),
      _ToolDef(Icons.play_circle_rounded, l.recordingMgmt, const Color(0xFFEF4444), const Color(0xFFDC2626)),
      _ToolDef(Icons.folder_rounded, l.fileBrowser, const Color(0xFF14B8A6), const Color(0xFF0D9488)),
      _ToolDef(Icons.phone_android_rounded, l.phoneAuto, const Color(0xFF4F46E5), const Color(0xFF4338CA)),
      _ToolDef(Icons.psychology_rounded, l.modelMgmt, const Color(0xFFEC4899), const Color(0xFFDB2777)),
      _ToolDef(Icons.history_rounded, l.execLog, const Color(0xFF6B7280), const Color(0xFF4B5563)),
      _ToolDef(Icons.extension_rounded, l.pluginMarket, const Color(0xFF0EA5E9), const Color(0xFF0284C7)),
      _ToolDef(Icons.add_circle_rounded, l.moreTools, const Color(0xFF94A3B8), const Color(0xFF64748B)),
    ];

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Title
              Text(
                l.tabTools,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppTheme.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 16),

              // Category tabs
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final isSelected = _selectedCategory == index;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedCategory = index),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: isSelected ? AppTheme.gradientPrimary : null,
                          color: isSelected
                            ? null
                            : (isDark ? const Color(0xFF1A1D2E) : Colors.white),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: isSelected ? [
                            BoxShadow(
                              color: AppTheme.primaryBlue.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ] : AppTheme.cardShadowSmall,
                        ),
                        child: Text(
                          categories[index],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected
                              ? Colors.white
                              : (isDark ? Colors.white60 : AppTheme.textSecondary),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),

              // Tool grid 3×4
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 0.9,
                ),
                itemCount: tools.length,
                itemBuilder: (context, index) {
                  final tool = tools[index];
                  return ToolGridItem(
                    icon: tool.icon,
                    label: tool.label,
                    color: tool.color,
                    gradientEndColor: tool.gradientEnd,
                    onTap: () => _openTool(context, tool.label),
                  );
                },
              ),

              // Background running
              if (_runningTools.isNotEmpty) ...[
                const SizedBox(height: 28),
                Text(
                  l.bgRunning,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppTheme.textPrimary,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 12),
                ..._runningTools.map((t) => _buildRunningItem(t, isDark)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRunningItem(_RunningTool tool, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.cardShadowSmall,
      ),
      child: Row(
        children: [
          Container(
            width: 10, height: 10,
            decoration: BoxDecoration(
              color: tool.color,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: tool.color.withOpacity(0.4), blurRadius: 6, spreadRadius: 1),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            tool.name,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white : AppTheme.textPrimary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              tool.status,
              style: TextStyle(
                fontSize: 12,
                color: isDark ? Colors.white38 : AppTheme.textHint,
              ),
            ),
          ),
          if (tool.pinned)
            Icon(Icons.push_pin_rounded, size: 16, color: AppTheme.primaryBlue),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => setState(() => _runningTools.remove(tool)),
            child: Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF2D3148) : const Color(0xFFF0F1F5),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.close_rounded, size: 14, color: isDark ? Colors.white38 : AppTheme.textHint),
            ),
          ),
        ],
      ),
    );
  }

  void _openTool(BuildContext context, String toolName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('打开: $toolName'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _ToolDef {
  final IconData icon;
  final String label;
  final Color color;
  final Color gradientEnd;
  _ToolDef(this.icon, this.label, this.color, this.gradientEnd);
}

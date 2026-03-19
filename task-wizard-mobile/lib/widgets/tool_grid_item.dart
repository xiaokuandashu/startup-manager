import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 工具网格项 — 渐变图标背景 + 按压缩放动效
class ToolGridItem extends StatefulWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color gradientEndColor;
  final VoidCallback onTap;

  const ToolGridItem({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.gradientEndColor,
    required this.onTap,
  });

  @override
  State<ToolGridItem> createState() => _ToolGridItemState();
}

class _ToolGridItemState extends State<ToolGridItem> with SingleTickerProviderStateMixin {
  double _scale = 1.0;

  void _onTapDown(TapDownDetails details) {
    setState(() => _scale = 0.93);
  }

  void _onTapUp(TapUpDetails details) {
    setState(() => _scale = 1.0);
    widget.onTap();
  }

  void _onTapCancel() {
    setState(() => _scale = 1.0);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: AnimatedScale(
        scale: _scale,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeInOut,
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Gradient icon background
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      widget.color.withOpacity(0.15),
                      widget.gradientEndColor.withOpacity(0.08),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(widget.icon, size: 26, color: widget.color),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Text(
                  widget.label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : AppTheme.textPrimary,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

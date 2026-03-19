import 'package:flutter/material.dart';
import '../models/message.dart';
import '../theme/app_theme.dart';

/// AI 聊天气泡 — 渐变用户气泡 + 精致 AI 气泡
class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  const ChatBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isUser = message.isUser;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            // AI Avatar
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                gradient: AppTheme.gradientPrimary,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryBlue.withOpacity(0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.smart_toy_rounded, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                gradient: isUser ? AppTheme.gradientPrimary : null,
                color: isUser
                  ? null
                  : (isDark ? const Color(0xFF1A1D2E) : Colors.white),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
                boxShadow: [
                  BoxShadow(
                    color: isUser
                      ? AppTheme.primaryBlue.withOpacity(0.25)
                      : Colors.black.withOpacity(isDark ? 0.2 : 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.content,
                    style: TextStyle(
                      fontSize: 15,
                      color: isUser
                        ? Colors.white
                        : (isDark ? const Color(0xDEFFFFFF) : AppTheme.textPrimary),
                      height: 1.5,
                    ),
                  ),
                  // Task cards if present
                  if (message.tasks != null && message.tasks!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    ...message.tasks!.map((task) => _buildTaskPreview(task, isDark)),
                  ],
                ],
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 10),
            // User Avatar
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF2D3148) : const Color(0xFFE8EBF5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.person_rounded,
                size: 18,
                color: isDark ? Colors.white60 : AppTheme.primaryBlue,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTaskPreview(Map<String, dynamic> task, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
          ? Colors.white.withOpacity(0.05)
          : AppTheme.successGreen.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(
              color: AppTheme.successGreen.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.task_alt_rounded, size: 16, color: AppTheme.successGreen),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task['name'] ?? '',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : AppTheme.textPrimary,
                  ),
                ),
                if (task['schedule'] != null)
                  Text(
                    task['schedule'],
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.white38 : AppTheme.textHint,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

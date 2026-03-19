import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../models/message.dart';
import '../providers/auth_provider.dart';
import '../providers/device_provider.dart';
import '../services/api_service.dart';
import '../widgets/chat_bubble.dart';
import '../theme/app_theme.dart';

/// AI 消息列表 Provider
final chatMessagesProvider = StateProvider<List<ChatMessage>>((ref) => []);
final aiModelProvider = StateProvider<String>((ref) => 'cloud');

/// 🤖 AI 助手页 — 沉浸式设计
class AiPage extends ConsumerStatefulWidget {
  const AiPage({super.key});

  @override
  ConsumerState<AiPage> createState() => _AiPageState();
}

class _AiPageState extends ConsumerState<AiPage> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isLoading = false;

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _inputController.text.trim();
    if (text.isEmpty || _isLoading) return;

    _inputController.clear();
    final messages = ref.read(chatMessagesProvider.notifier);
    final now = DateTime.now();

    messages.state = [
      ...messages.state,
      ChatMessage(id: 'u_${now.millisecondsSinceEpoch}', role: 'user', content: text),
    ];
    _scrollToBottom();

    setState(() => _isLoading = true);

    final ws = ref.read(wsServiceProvider);
    final isWsConnected = ref.read(wsConnectedProvider);
    final model = ref.read(aiModelProvider);

    String aiContent = '';

    if (isWsConnected) {
      // ===== WS 已连接：中转到电脑 =====
      ws.sendAiChat('connected_pc', text, model);

      // 等待 WS 响应（带超时）
      try {
        final response = await ws.messages
            .where((m) => m.type == 'ai_response')
            .first
            .timeout(const Duration(seconds: 15));
        aiContent = response.data['content'] as String? ?? '电脑未返回结果';
      } catch (_) {
        aiContent = '⏱ 等待电脑回复超时，请检查电脑是否在线';
      }
    } else {
      // ===== WS 未连接：调用云端 API =====
      try {
        final token = ref.read(authProvider).token ?? '';
        final resp = await ApiService.cloudAiChat(token, text, model);
        if (resp.containsKey('error')) {
          aiContent = '❌ ${resp['error']}';
        } else {
          final choices = resp['choices'] as List?;
          if (choices != null && choices.isNotEmpty) {
            final content = choices[0]['message']?['content'] ?? '';
            // 尝试解析 JSON 中的 message 字段
            try {
              final cleanJson = content.replaceAll(RegExp(r'```json\n?'), '').replaceAll(RegExp(r'```\n?'), '').trim();
              final parsed = _tryParseJson(cleanJson);
              if (parsed != null && parsed['message'] != null) {
                aiContent = parsed['message'] as String;
              } else {
                aiContent = content;
              }
            } catch (_) {
              aiContent = content;
            }
          } else {
            aiContent = '云端 AI 返回了空响应';
          }
        }
      } catch (e) {
        aiContent = '❌ 网络错误: $e';
      }
    }

    messages.state = [
      ...messages.state,
      ChatMessage(
        id: 'ai_${now.millisecondsSinceEpoch}',
        role: 'ai',
        content: aiContent,
      ),
    ];
    _scrollToBottom();

    setState(() => _isLoading = false);
  }

  Map<String, dynamic>? _tryParseJson(String text) {
    try {
      return Map<String, dynamic>.from(
        const JsonDecoder().convert(text) as Map,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final messages = ref.watch(chatMessagesProvider);
    final model = ref.watch(aiModelProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ===== 沉浸式顶栏 =====
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  Text(
                    l.aiAssistant,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : AppTheme.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const Spacer(),
                  // Model selector pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: AppTheme.cardShadowSmall,
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: model,
                        isDense: true,
                        icon: Icon(Icons.expand_more_rounded, size: 18, color: AppTheme.primaryBlue),
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.primaryBlue,
                          fontWeight: FontWeight.w600,
                        ),
                        items: [
                          DropdownMenuItem(value: 'cloud', child: Text('☁️ ${l.cloudModel}')),
                          DropdownMenuItem(value: 'local', child: Text('📱 ${l.localModel}')),
                          DropdownMenuItem(value: 'openclaw', child: const Text('🐾 OpenClaw')),
                        ],
                        onChanged: (v) => ref.read(aiModelProvider.notifier).state = v ?? 'cloud',
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ===== 消息区域 =====
            Expanded(
              child: messages.isEmpty
                ? _buildEmptyState(l, isDark)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) => ChatBubble(message: messages[index]),
                  ),
            ),

            // ===== 浮动输入栏 =====
            Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Voice button
                  _buildInputButton(Icons.mic_rounded, isDark, () {/* TODO */}),
                  // Image button
                  _buildInputButton(Icons.image_rounded, isDark, () {/* TODO */}),
                  // Text input
                  Expanded(
                    child: TextField(
                      controller: _inputController,
                      style: TextStyle(
                        fontSize: 15,
                        color: isDark ? Colors.white : AppTheme.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: l.inputHint,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        hintStyle: TextStyle(
                          fontSize: 14,
                          color: isDark ? Colors.white30 : AppTheme.textHint,
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 4),
                  // Send button
                  Container(
                    width: 42, height: 42,
                    decoration: BoxDecoration(
                      gradient: _isLoading ? null : AppTheme.gradientPrimary,
                      color: _isLoading ? (isDark ? const Color(0xFF2D3148) : const Color(0xFFD0D5E8)) : null,
                      borderRadius: BorderRadius.circular(21),
                      boxShadow: _isLoading ? null : [
                        BoxShadow(
                          color: AppTheme.primaryBlue.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: _isLoading ? null : _send,
                        borderRadius: BorderRadius.circular(21),
                        child: Center(
                          child: _isLoading
                            ? const SizedBox(
                                width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.arrow_upward_rounded, size: 20, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildInputButton(IconData icon, bool isDark, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(
            icon,
            size: 22,
            color: isDark ? Colors.white38 : AppTheme.textHint,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations l, bool isDark) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Gradient circle with AI icon
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppTheme.primaryBlue.withOpacity(0.1),
                  AppTheme.primaryLight.withOpacity(0.05),
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Container(
                width: 64, height: 64,
                decoration: BoxDecoration(
                  gradient: AppTheme.gradientPrimary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryBlue.withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.smart_toy_rounded, size: 32, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            l.inputHint,
            style: TextStyle(
              fontSize: 16,
              color: isDark ? Colors.white38 : AppTheme.textHint,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l.isZh ? '支持文字、语音、图片输入' : 'Text, voice, and image input supported',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.white24 : AppTheme.textHint.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../l10n/app_localizations.dart';
import '../models/message.dart';
import '../models/device.dart';
import '../providers/auth_provider.dart';
import '../providers/device_provider.dart';
import '../services/api_service.dart';
import '../widgets/chat_bubble.dart';
import '../theme/app_theme.dart';

/// AI 消息列表 Provider
final chatMessagesProvider = StateProvider<List<ChatMessage>>((ref) => []);

/// 当前选择的 AI 模型 ID
final aiModelProvider = StateProvider<String>((ref) => 'deepseek_cloud_official');

/// 三个能力开关
final deepThinkProvider = StateProvider<bool>((ref) => false);
final smartSearchProvider = StateProvider<bool>((ref) => false);
final localExecProvider = StateProvider<bool>((ref) => false);

/// 模型定义
class AiModel {
  final String id;
  final String name;
  final String desc;
  final bool isCloud;
  final String tag; // 官方 / 自己 / 电脑本地
  final Color color;
  final IconData icon;

  const AiModel({
    required this.id,
    required this.name,
    required this.desc,
    required this.isCloud,
    required this.tag,
    required this.color,
    required this.icon,
  });
}

const _models = [
  AiModel(
    id: 'deepseek_cloud_official',
    name: 'DeepSeek 云端',
    desc: '理解复杂指令，需要网络\n每天100次',
    isCloud: true,
    tag: '官方',
    color: Color(0xFF3b82f6),
    icon: Icons.cloud_rounded,
  ),
  AiModel(
    id: 'deepseek_cloud_own',
    name: 'DeepSeek 云端',
    desc: '理解复杂指令，需要网络\n自有密钥·无限制',
    isCloud: true,
    tag: '自己',
    color: Color(0xFFf59e0b),
    icon: Icons.vpn_key_rounded,
  ),
  AiModel(
    id: 'deepseek_r1_local',
    name: 'DeepSeek-R1 1.5B',
    desc: '深度思考(CoT)，R1-70B蒸馏版',
    isCloud: false,
    tag: '电脑本地',
    color: Color(0xFF8b5cf6),
    icon: Icons.memory_rounded,
  ),
  AiModel(
    id: 'nanbeige_local',
    name: 'Nanbeige 4.1 3B',
    desc: '多语言思考，38亿思考模型',
    isCloud: false,
    tag: '电脑本地',
    color: Color(0xFF06b6d4),
    icon: Icons.psychology_rounded,
  ),
  AiModel(
    id: 'phi4_local',
    name: 'Phi-4 Mini',
    desc: '微软最新，推理增强型',
    isCloud: false,
    tag: '电脑本地',
    color: Color(0xFF10b981),
    icon: Icons.auto_awesome_rounded,
  ),
];

/// 🤖 AI 助手页 — 支持电脑联动 + 离线置灰
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

  /// 获取当前选中设备
  Device? _selectedDevice() {
    final deviceId = ref.read(selectedDeviceProvider);
    final devices = ref.read(deviceListProvider);
    if (deviceId == null || devices.isEmpty) return null;
    try {
      return devices.firstWhere((d) => d.id == deviceId);
    } catch (_) {
      return devices.isNotEmpty ? devices.first : null;
    }
  }

  bool _isPcOnline() {
    final device = _selectedDevice();
    return device?.online ?? false;
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
    final currentModel = _models.firstWhere((m) => m.id == model, orElse: () => _models[0]);

    String aiContent = '';

    if (!currentModel.isCloud && _isPcOnline() && isWsConnected) {
      // 电脑本地模型 + 电脑在线 → WS 中转
      ws.sendAiChat(_selectedDevice()?.id ?? '', text, model);
      try {
        final response = await ws.messages
            .where((m) => m.type == 'ai_response')
            .first
            .timeout(const Duration(seconds: 30));
        aiContent = response.data['content'] as String? ?? '电脑未返回结果';
      } catch (_) {
        aiContent = '⏱ 等待电脑回复超时，请检查电脑是否在线';
      }
    } else if (currentModel.isCloud) {
      // 云端模型 → 直接调用 API
      try {
        final token = ref.read(authProvider).token ?? '';
        final resp = await ApiService.cloudAiChat(token, text, model);
        if (resp.containsKey('error')) {
          aiContent = '❌ ${resp['error']}';
        } else {
          final choices = resp['choices'] as List?;
          if (choices != null && choices.isNotEmpty) {
            final content = choices[0]['message']?['content'] ?? '';
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
    } else {
      aiContent = '❌ 电脑不在线，无法使用电脑本地模型\n请切换到 DeepSeek 云端模型';
    }

    messages.state = [
      ...messages.state,
      ChatMessage(id: 'ai_${now.millisecondsSinceEpoch}', role: 'ai', content: aiContent),
    ];
    _scrollToBottom();
    setState(() => _isLoading = false);
  }

  Map<String, dynamic>? _tryParseJson(String text) {
    try {
      return Map<String, dynamic>.from(const JsonDecoder().convert(text) as Map);
    } catch (_) {
      return null;
    }
  }

  /// 显示模型选择面板
  void _showModelPanel() {
    final pcOnline = _isPcOnline();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _ModelPanel(
        pcOnline: pcOnline,
        currentModel: ref.read(aiModelProvider),
        onSelect: (id) {
          ref.read(aiModelProvider.notifier).state = id;
          Navigator.pop(ctx);
        },
        onConfigKey: () {
          Navigator.pop(ctx);
          _showKeyConfigDialog();
        },
      ),
    );
  }

  /// 显示密钥配置对话框（需先选电脑）
  void _showKeyConfigDialog() {
    final device = _selectedDevice();
    if (device == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请先选择一台电脑'), backgroundColor: Colors.orange),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => _KeyConfigDialog(
        deviceName: device.name.isEmpty ? device.hostname : device.name,
        onSave: (key) {
          // 通过 WS 发送密钥更新
          final ws = ref.read(wsServiceProvider);
          ws.send(WsMessage(type: 'update_key', data: {
            'key': key,
            'device_id': device.id,
          }));
          Navigator.pop(ctx);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(key.isEmpty ? '密钥已清除' : '密钥已保存，同步到所有设备'),
              backgroundColor: AppTheme.successGreen,
            ),
          );
        },
      ),
    );
  }

  /// 显示设备选择器
  void _showDeviceSelector() {
    final devices = ref.read(deviceListProvider);
    final selected = ref.read(selectedDeviceProvider);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DeviceSelector(
        devices: devices,
        selectedId: selected,
        onSelect: (id) {
          ref.read(selectedDeviceProvider.notifier).state = id;
          Navigator.pop(ctx);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final messages = ref.watch(chatMessagesProvider);
    final modelId = ref.watch(aiModelProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final devices = ref.watch(deviceListProvider);
    final selectedId = ref.watch(selectedDeviceProvider);
    final deepThink = ref.watch(deepThinkProvider);
    final smartSearch = ref.watch(smartSearchProvider);
    final localExec = ref.watch(localExecProvider);

    // 自动选择第一台设备
    if (selectedId == null && devices.isNotEmpty) {
      Future.microtask(() {
        ref.read(selectedDeviceProvider.notifier).state = devices.first.id;
      });
    }

    final pcOnline = _isPcOnline();
    final currentModel = _models.firstWhere((m) => m.id == modelId, orElse: () => _models[0]);
    final selectedDevice = _selectedDevice();

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // ===== 顶栏: AI 助手 + 设备选择 =====
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
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
                  // 设备选择 pill
                  GestureDetector(
                    onTap: _showDeviceSelector,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: AppTheme.cardShadowSmall,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            pcOnline ? Icons.computer_rounded : Icons.computer_rounded,
                            size: 16,
                            color: pcOnline ? AppTheme.successGreen : AppTheme.textHint,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            selectedDevice?.name ?? '选择电脑',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? Colors.white70 : AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          // 在线指示灯
                          Container(
                            width: 6, height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: pcOnline ? AppTheme.successGreen : const Color(0xFFD1D5DB),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.expand_more_rounded, size: 16,
                            color: isDark ? Colors.white38 : AppTheme.textHint),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ===== 模型选择 + 在线状态 =====
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
              child: Row(
                children: [
                  // 模型选择按钮
                  GestureDetector(
                    onTap: _showModelPanel,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: currentModel.color.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(currentModel.icon, size: 15, color: currentModel.color),
                          const SizedBox(width: 5),
                          Text(
                            currentModel.name,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: currentModel.color,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: currentModel.color.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              currentModel.tag,
                              style: TextStyle(fontSize: 9, color: currentModel.color, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.expand_more_rounded, size: 14, color: currentModel.color),
                        ],
                      ),
                    ),
                  ),
                  const Spacer(),
                  // 在线状态
                  if (!pcOnline)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.warningOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.cloud_off_rounded, size: 12, color: AppTheme.warningOrange),
                          const SizedBox(width: 3),
                          Text(
                            '电脑离线',
                            style: TextStyle(fontSize: 10, color: AppTheme.warningOrange, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // ===== 三个开关 =====
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
              child: Row(
                children: [
                  _ToggleChip(
                    icon: Icons.auto_awesome_rounded,
                    label: '深度思考',
                    isOn: deepThink,
                    enabled: pcOnline,
                    onTap: pcOnline
                        ? () => ref.read(deepThinkProvider.notifier).state = !deepThink
                        : null,
                  ),
                  const SizedBox(width: 8),
                  _ToggleChip(
                    icon: Icons.travel_explore_rounded,
                    label: '智能搜索',
                    isOn: smartSearch,
                    enabled: pcOnline,
                    onTap: pcOnline
                        ? () => ref.read(smartSearchProvider.notifier).state = !smartSearch
                        : null,
                  ),
                  const SizedBox(width: 8),
                  _ToggleChip(
                    icon: Icons.terminal_rounded,
                    label: '本地执行',
                    isOn: localExec,
                    enabled: pcOnline,
                    onTap: pcOnline
                        ? () => ref.read(localExecProvider.notifier).state = !localExec
                        : null,
                  ),
                ],
              ),
            ),

            // ===== 消息区域 =====
            Expanded(
              child: messages.isEmpty
                  ? _buildEmptyState(l, isDark, pcOnline)
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
                  _buildInputButton(Icons.mic_rounded, isDark, () {}),
                  _buildInputButton(Icons.image_rounded, isDark, () {}),
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
          child: Icon(icon, size: 22, color: isDark ? Colors.white38 : AppTheme.textHint),
        ),
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations l, bool isDark, bool pcOnline) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
          if (!pcOnline) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.warningOrange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cloud_off_rounded, size: 14, color: AppTheme.warningOrange),
                  const SizedBox(width: 6),
                  Text(
                    '电脑离线，仅支持云端模型',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.warningOrange,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ========================================
// 开关 Chip 组件
// ========================================
class _ToggleChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isOn;
  final bool enabled;
  final VoidCallback? onTap;

  const _ToggleChip({
    required this.icon,
    required this.label,
    required this.isOn,
    required this.enabled,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeColor = AppTheme.successGreen;
    final disabledColor = isDark ? const Color(0xFF3A3D4E) : const Color(0xFFE5E7EB);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: !enabled
              ? disabledColor.withOpacity(0.5)
              : isOn
                  ? activeColor.withOpacity(0.12)
                  : (isDark ? const Color(0xFF1A1D2E) : Colors.white),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: !enabled
                ? Colors.transparent
                : isOn
                    ? activeColor.withOpacity(0.3)
                    : (isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE5E7EB)),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 13,
              color: !enabled
                  ? (isDark ? Colors.white24 : AppTheme.textHint.withOpacity(0.4))
                  : isOn
                      ? activeColor
                      : (isDark ? Colors.white54 : AppTheme.textSecondary),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: !enabled
                    ? (isDark ? Colors.white24 : AppTheme.textHint.withOpacity(0.4))
                    : isOn
                        ? activeColor
                        : (isDark ? Colors.white54 : AppTheme.textSecondary),
              ),
            ),
            if (isOn && enabled) ...[
              const SizedBox(width: 3),
              Container(
                width: 5, height: 5,
                decoration: BoxDecoration(shape: BoxShape.circle, color: activeColor),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ========================================
// 模型选择底部面板
// ========================================
class _ModelPanel extends StatelessWidget {
  final bool pcOnline;
  final String currentModel;
  final ValueChanged<String> onSelect;
  final VoidCallback? onConfigKey;

  const _ModelPanel({
    required this.pcOnline,
    required this.currentModel,
    required this.onSelect,
    this.onConfigKey,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 36, height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Row(
              children: [
                Text(
                  '选择 AI 模型',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppTheme.textPrimary,
                  ),
                ),
                const Spacer(),
                if (!pcOnline)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.warningOrange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cloud_off_rounded, size: 12, color: AppTheme.warningOrange),
                        const SizedBox(width: 3),
                        Text('电脑离线', style: TextStyle(fontSize: 10, color: AppTheme.warningOrange, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          // Model list
          ...List.generate(_models.length, (i) {
            final m = _models[i];
            final isSelected = m.id == currentModel;
            final isDisabled = !m.isCloud && !pcOnline;
            return _ModelTile(
              model: m,
              isSelected: isSelected,
              isDisabled: isDisabled,
              isDark: isDark,
              onTap: isDisabled ? null : () => onSelect(m.id),
              onConfigKey: m.id == 'deepseek_cloud_own' ? onConfigKey : null,
            );
          }),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
        ],
      ),
    );
  }
}

class _ModelTile extends StatelessWidget {
  final AiModel model;
  final bool isSelected;
  final bool isDisabled;
  final bool isDark;
  final VoidCallback? onTap;
  final VoidCallback? onConfigKey;

  const _ModelTile({
    required this.model,
    required this.isSelected,
    required this.isDisabled,
    required this.isDark,
    this.onTap,
    this.onConfigKey,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDisabled
              ? (isDark ? const Color(0xFF151721) : const Color(0xFFF5F5F5))
              : isSelected
                  ? model.color.withOpacity(isDark ? 0.15 : 0.06)
                  : (isDark ? const Color(0xFF242738) : const Color(0xFFF9FAFB)),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected && !isDisabled
                ? model.color.withOpacity(0.4)
                : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: isDisabled
                    ? (isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE5E7EB))
                    : model.color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                model.icon,
                size: 20,
                color: isDisabled
                    ? (isDark ? Colors.white24 : const Color(0xFFB0B6C3))
                    : model.color,
              ),
            ),
            const SizedBox(width: 12),
            // Name + desc
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          model.name,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isDisabled
                                ? (isDark ? Colors.white24 : const Color(0xFFB0B6C3))
                                : (isDark ? Colors.white : AppTheme.textPrimary),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: isDisabled
                              ? (isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE5E7EB))
                              : model.color.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          model.tag,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: isDisabled
                                ? (isDark ? Colors.white24 : const Color(0xFFB0B6C3))
                                : model.color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    model.desc.split('\n').first,
                    style: TextStyle(
                      fontSize: 11,
                      color: isDisabled
                          ? (isDark ? Colors.white12 : const Color(0xFFD1D5DB))
                          : (isDark ? Colors.white38 : AppTheme.textHint),
                    ),
                  ),
                ],
              ),
            ),
            // Config key button (only for deepseek_cloud_own)
            if (onConfigKey != null && !isDisabled) ...[
              GestureDetector(
                onTap: onConfigKey,
                child: Container(
                  width: 30, height: 30,
                  decoration: BoxDecoration(
                    color: model.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.settings_rounded, size: 15, color: model.color),
                ),
              ),
              const SizedBox(width: 6),
            ],
            // Status
            if (isSelected && !isDisabled)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: model.color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '使用中',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: model.color),
                ),
              )
            else if (!isDisabled)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2A2D3E) : const Color(0xFFF0F1F5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '切换',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white38 : AppTheme.textSecondary),
                ),
              )
            else
              Icon(Icons.lock_outline_rounded, size: 16,
                color: isDark ? Colors.white12 : const Color(0xFFD1D5DB)),
          ],
        ),
      ),
    );
  }
}

// ========================================
// 设备选择器底部面板
// ========================================
class _DeviceSelector extends StatelessWidget {
  final List<Device> devices;
  final String? selectedId;
  final ValueChanged<String> onSelect;

  const _DeviceSelector({
    required this.devices,
    required this.selectedId,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1A1D2E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36, height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : const Color(0xFFD1D5DB),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
            child: Row(
              children: [
                Text(
                  '我的电脑',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '${devices.length}台',
                  style: TextStyle(fontSize: 13, color: AppTheme.textHint),
                ),
              ],
            ),
          ),
          if (devices.isEmpty)
            Padding(
              padding: const EdgeInsets.all(40),
              child: Column(
                children: [
                  Icon(Icons.computer_rounded, size: 40, color: AppTheme.textHint.withOpacity(0.3)),
                  const SizedBox(height: 12),
                  Text('暂无设备', style: TextStyle(color: AppTheme.textHint)),
                  const SizedBox(height: 4),
                  Text('请在电脑端登录同一账号', style: TextStyle(fontSize: 12, color: AppTheme.textHint.withOpacity(0.6))),
                ],
              ),
            )
          else
            ...devices.map((d) {
              final isSelected = d.id == selectedId;
              return GestureDetector(
                onTap: () => onSelect(d.id),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppTheme.primaryBlue.withOpacity(isDark ? 0.15 : 0.06)
                        : (isDark ? const Color(0xFF242738) : const Color(0xFFF9FAFB)),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryBlue.withOpacity(0.3) : Colors.transparent,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Platform icon
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(
                          color: d.online
                              ? AppTheme.successGreen.withOpacity(0.1)
                              : (isDark ? const Color(0xFF2A2D3E) : const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(d.platformIcon, style: const TextStyle(fontSize: 20)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              d.name.isEmpty ? d.hostname : d.name,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white : AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              d.online ? '🟢 在线' : '⚪ 离线',
                              style: TextStyle(
                                fontSize: 11,
                                color: d.online ? AppTheme.successGreen : AppTheme.textHint,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        Icon(Icons.check_circle_rounded, size: 20, color: AppTheme.primaryBlue),
                    ],
                  ),
                ),
              );
            }),
          SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
        ],
      ),
    );
  }
}

// ========================================
// DeepSeek 密钥配置对话框
// ========================================
class _KeyConfigDialog extends StatefulWidget {
  final String deviceName;
  final Function(String key) onSave;

  const _KeyConfigDialog({
    required this.deviceName,
    required this.onSave,
  });

  @override
  State<_KeyConfigDialog> createState() => _KeyConfigDialogState();
}

class _KeyConfigDialogState extends State<_KeyConfigDialog> {
  final _keyController = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return AlertDialog(
      backgroundColor: isDark ? const Color(0xFF1A1D2E) : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.vpn_key_rounded, size: 20, color: const Color(0xFFf59e0b)),
              const SizedBox(width: 8),
              Text(
                '配置 DeepSeek 密钥',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : AppTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.computer_rounded, size: 13, color: AppTheme.primaryBlue),
                const SizedBox(width: 4),
                Text(
                  '当前电脑: ${widget.deviceName}',
                  style: TextStyle(fontSize: 11, color: AppTheme.primaryBlue, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '输入您的 DeepSeek API Key，保存后将同步到该账号下所有设备。',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? Colors.white38 : AppTheme.textHint,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _keyController,
            obscureText: _obscure,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.white : AppTheme.textPrimary,
              fontFamily: 'monospace',
            ),
            decoration: InputDecoration(
              hintText: 'sk-xxxx...',
              prefixIcon: Icon(Icons.key_rounded, size: 18, color: AppTheme.textHint),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                  size: 18,
                  color: AppTheme.textHint,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => widget.onSave(''),
          child: Text('清除密钥', style: TextStyle(color: AppTheme.errorRed, fontSize: 13)),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('取消', style: TextStyle(fontSize: 13)),
        ),
        ElevatedButton(
          onPressed: () => widget.onSave(_keyController.text.trim()),
          child: const Text('保存并同步', style: TextStyle(fontSize: 13)),
        ),
      ],
    );
  }
}

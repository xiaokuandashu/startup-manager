/// 聊天消息模型
class ChatMessage {
  final String id;
  final String role; // user, ai
  final String content;
  final DateTime timestamp;
  final String? imagePath;
  final List<Map<String, dynamic>>? tasks;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    DateTime? timestamp,
    this.imagePath,
    this.tasks,
  }) : timestamp = timestamp ?? DateTime.now();

  bool get isUser => role == 'user';
  bool get isAi => role == 'ai';
}

/// WebSocket 消息
class WsMessage {
  final String type;
  final Map<String, dynamic> data;

  WsMessage({required this.type, this.data = const {}});

  factory WsMessage.fromJson(Map<String, dynamic> json) => WsMessage(
    type: json['type'] ?? '',
    data: Map<String, dynamic>.from(json)..remove('type'),
  );

  Map<String, dynamic> toJson() => {'type': type, ...data};
}

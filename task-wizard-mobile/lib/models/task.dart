/// 任务模型 — 与桌面端 StartupTask 对齐
class Task {
  final String id;
  final String name;
  final String taskType; // application, script, chain
  final String path;
  final String scheduleType; // daily, weekly, once, login
  final String scheduleTime;
  final List<int> scheduleDays;
  final bool enabled;
  final double confidence;
  final List<TaskStep>? steps;
  final String? recordingName;

  Task({
    required this.id,
    required this.name,
    this.taskType = 'application',
    this.path = '',
    this.scheduleType = 'daily',
    this.scheduleTime = '09:00',
    this.scheduleDays = const [],
    this.enabled = true,
    this.confidence = 0.9,
    this.steps,
    this.recordingName,
  });

  factory Task.fromJson(Map<String, dynamic> json) => Task(
    id: json['id'] ?? '',
    name: json['task_name'] ?? json['name'] ?? '',
    taskType: json['task_type'] ?? 'application',
    path: json['path'] ?? '',
    scheduleType: json['schedule_type'] ?? 'daily',
    scheduleTime: json['schedule_time'] ?? '09:00',
    scheduleDays: (json['schedule_days'] as List?)?.cast<int>() ?? [],
    enabled: json['enabled'] ?? true,
    confidence: (json['confidence'] ?? 0.9).toDouble(),
    steps: (json['steps'] as List?)?.map((s) => TaskStep.fromJson(s)).toList(),
    recordingName: json['recording_name'],
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'task_name': name,
    'task_type': taskType,
    'path': path,
    'schedule_type': scheduleType,
    'schedule_time': scheduleTime,
    'schedule_days': scheduleDays,
    'enabled': enabled,
    'confidence': confidence,
    'steps': steps?.map((s) => s.toJson()).toList(),
    'recording_name': recordingName,
  };

  Task copyWith({bool? enabled, String? name, String? scheduleTime}) => Task(
    id: id,
    name: name ?? this.name,
    taskType: taskType,
    path: path,
    scheduleType: scheduleType,
    scheduleTime: scheduleTime ?? this.scheduleTime,
    scheduleDays: scheduleDays,
    enabled: enabled ?? this.enabled,
    confidence: confidence,
    steps: steps,
    recordingName: recordingName,
  );

  String get typeLabel {
    switch (taskType) {
      case 'chain': return '链式';
      case 'script': return '脚本';
      case 'application': return '应用';
      default: return taskType;
    }
  }
}

class TaskStep {
  final int order;
  final String type;
  final Map<String, dynamic> params;

  TaskStep({required this.order, required this.type, this.params = const {}});

  factory TaskStep.fromJson(Map<String, dynamic> json) => TaskStep(
    order: json['order'] ?? 0,
    type: json['type'] ?? '',
    params: Map<String, dynamic>.from(json)..removeWhere((k, _) => k == 'order' || k == 'type'),
  );

  Map<String, dynamic> toJson() => {'order': order, 'type': type, ...params};
}

export interface StartupTask {
  id: string;
  name: string;
  path: string;
  icon?: string;           // Base64 data URI 应用图标
  enabled: boolean;
  type: 'application' | 'script' | 'service' | 'recording';
  taskType: string;       // 打开应用 / 打开执行文件 / 路径打开应用 / 录制回放
  timeType: string;       // 每日循环 / 计算机启动时 / 一次 / 每周 / 每月
  executeTime: string;    // 执行时间 e.g. "8:12:00"
  timeUntilExec: string;  // 距离任务开始 e.g. "9小时3分12秒后执行"
  status: 'running' | 'stopped' | 'error';
  statusText?: string;    // 备注里的状态文字 e.g. "今日执行失败" / "今日执行成功"
  note: string;           // 备注 e.g. "每日定时执行"
  startupTime?: number;   // ms
  lastRun?: string;
  fileExt?: string;       // .app / .bat / .exe / .sh
  recordingId?: string;   // 绑定的录制 ID
  recordingName?: string; // 绑定的录制名称
}

export interface LogEntry {
  id: string;
  taskName: string;
  taskType: string;
  timeType: string;
  executeTime: string;
  action: 'enable' | 'disable' | 'add' | 'remove' | 'error' | 'start' | 'stop';
  message: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  statusText: string;
  fileExt?: string;
  icon?: string;
}

export type PageType = 'home' | 'tools' | 'settings';

// 工具标签页（浏览器风格）
export type ToolType = 'ai' | 'recording' | 'marketplace' | 'log';

export interface ToolTab {
  id: string;
  type: ToolType;
  title: string;
  icon: string;
  locked: boolean;
}

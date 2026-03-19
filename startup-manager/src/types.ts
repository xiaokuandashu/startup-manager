import React from 'react';

// Phase 2: 链式任务步骤定义
export interface TaskStep {
  order: number;
  type: 'open_app' | 'wait' | 'playback_recording' | 'execute_script' | 'file_action' | 'vision_caption' | 'browser_action';
  // open_app
  app_path?: string;
  // wait
  wait_seconds?: number;
  wait_minutes?: number;
  // playback_recording
  recording_name?: string;
  recording_id?: string;
  // execute_script
  script_content?: string;
  script_type?: 'bash' | 'applescript' | 'powershell';
  // file_action
  action?: string;
  path?: string;
  // vision_caption
  image_index?: number;
  prompt?: string;
  // browser_action
  tool?: string;
  url?: string;
  selector?: string;
  text?: string;
}

export interface StartupTask {
  id: string;
  name: string;
  path: string;
  icon?: string;           // Base64 data URI 应用图标
  enabled: boolean;
  type: 'application' | 'script' | 'service' | 'recording';
  taskType: string;       // 打开应用 / 打开执行文件 / 路径打开应用 / 录制回放 / 链式任务
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
  steps?: TaskStep[];     // Phase 2: 链式任务步骤（当 taskType 为 chain 时使用）
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
  icon: React.ReactNode;
  locked: boolean;
}

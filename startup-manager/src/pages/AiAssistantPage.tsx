import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../i18n';

interface AiTaskResult {
  task_name: string;
  task_type: string;
  path: string;
  schedule_type: string;
  schedule_time: string;
  schedule_days: number[];
  enabled: boolean;
  confidence: number;
}

interface AiResponse {
  message: string;
  response_type: string;
  tasks: AiTaskResult[];
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  content: string;
  tasks?: AiTaskResult[];
  responseType?: string;
  loading?: boolean;
  timestamp: number;
}

interface AiAssistantPageProps {
  lang?: Language;
  onAddTask?: (task: AiTaskResult) => void;
}

const QUICK_COMMANDS = [
  { label: '打开微信', icon: '💬' },
  { label: '每天9点打开Chrome', icon: '🌐' },
  { label: '开机启动钉钉', icon: '📌' },
  { label: '查看所有任务', icon: '📋' },
  { label: '帮助', icon: '❓' },
];

const SCHEDULE_LABELS: Record<string, string> = {
  startup: '🚀 开机启动',
  once: '⚡ 一次性',
  daily: '📅 每天',
  weekly: '📆 每周',
  monthly: '🗓️ 每月',
};

const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ lang = 'zh', onAddTask }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'ai',
      content: '👋 你好！我是 AI 助手。\n\n告诉我你想做什么，我来帮你创建自动化任务。\n\n比如：「打开微信」「每天9点打开Chrome」「开机启动钉钉」',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // 添加 loading 消息
    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'ai',
      content: '',
      loading: true,
      timestamp: Date.now(),
    }]);

    try {
      let response: AiResponse;

      // 先尝试本地规则引擎
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        response = await invoke<AiResponse>('ai_parse_intent', { input: text });

        // 如果本地无法解析，调用云端 DeepSeek
        if (response.response_type === 'cloud_needed') {
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: '🌐 正在联系 AI 云端...' } : m
          ));

          try {
            const cloudResult = await invoke<string>('ai_cloud_parse', { input: text });
            // 解析云端 JSON 响应
            const cleanJson = cloudResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanJson) as AiResponse;
            response = parsed;
          } catch (cloudErr) {
            // 云端失败，使用本地结果
            response.message = '🤔 AI 云端暂时不可用，请试试更简单的表达方式。\n\n例如：「打开微信」「每天9点打开Chrome」';
            response.response_type = 'info';
          }
        }
      } else {
        // 开发模式模拟
        response = {
          message: `📋 模拟解析：「${text}」\n\n这是开发模式，实际运行时将调用 AI 引擎。`,
          response_type: 'info',
          tasks: [],
        };
      }

      // 替换 loading 消息为实际回复
      const aiMsg: ChatMessage = {
        id: loadingId,
        role: 'ai',
        content: response.message,
        tasks: response.tasks,
        responseType: response.response_type,
        timestamp: Date.now(),
      };
      setMessages(prev => prev.map(m => m.id === loadingId ? aiMsg : m));

    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? {
          ...m,
          content: '❌ 解析失败，请重试。',
          loading: false,
          responseType: 'error',
        } : m
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAddTask = async (task: AiTaskResult) => {
    if (onAddTask) {
      onAddTask(task);
    }

    // 保存到 localStorage 任务列表
    try {
      const existing = JSON.parse(localStorage.getItem('tasks') || '[]');
      const newTask = {
        id: Date.now().toString(),
        name: task.task_name,
        path: task.path,
        type: task.task_type,
        scheduleType: task.schedule_type,
        scheduleTime: task.schedule_time,
        scheduleDays: task.schedule_days,
        enabled: task.enabled,
        createdAt: new Date().toISOString(),
        source: 'ai',
      };
      existing.push(newTask);
      localStorage.setItem('tasks', JSON.stringify(existing));

      // 添加成功消息
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        content: `✅ 任务「${task.task_name}」已添加到任务列表！\n\n你可以在主页查看和管理它。`,
        timestamp: Date.now(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        content: `❌ 添加任务失败：${e}`,
        responseType: 'error',
        timestamp: Date.now(),
      }]);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    setMessages([{
      id: Date.now(),
      role: 'ai',
      content: '👋 对话已清空。告诉我你想做什么吧！',
      timestamp: Date.now(),
    }]);
  };

  return (
    <div className="ai-page">
      {/* 消息列表 */}
      <div className="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
            <div className="ai-msg-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="ai-msg-body">
              {msg.loading ? (
                <div className="ai-typing">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <>
                  <div className="ai-msg-text" dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/`(.*?)`/g, '<code>$1</code>')
                      .replace(/\n/g, '<br/>')
                  }} />
                  {/* 任务卡片 */}
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="ai-task-cards">
                      {msg.tasks.map((task, i) => (
                        <div key={i} className="ai-task-card">
                          <div className="ai-task-card-header">
                            <span className="ai-task-type-badge">
                              {task.task_type === 'application' ? '📱' :
                               task.task_type === 'script' ? '📜' : '📂'}
                              {task.task_type}
                            </span>
                            <span className="ai-task-schedule">
                              {SCHEDULE_LABELS[task.schedule_type] || task.schedule_type}
                              {task.schedule_time && ` ${task.schedule_time}`}
                            </span>
                          </div>
                          <div className="ai-task-card-name">{task.task_name}</div>
                          {task.path && (
                            <div className="ai-task-card-path">{task.path}</div>
                          )}
                          <div className="ai-task-card-footer">
                            <span className={`ai-confidence ${task.confidence >= 0.8 ? 'high' : 'low'}`}>
                              置信度 {Math.round(task.confidence * 100)}%
                            </span>
                            <button
                              className="ai-btn-add-task"
                              onClick={() => handleAddTask(task)}
                            >
                              ✅ 添加任务
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷指令 */}
      <div className="ai-quick-bar">
        {QUICK_COMMANDS.map((cmd, i) => (
          <button key={i} className="ai-quick-btn" onClick={() => handleQuickCommand(cmd.label)}>
            {cmd.icon} {cmd.label}
          </button>
        ))}
        <button className="ai-quick-btn ai-quick-clear" onClick={clearHistory}>
          🗑️ 清空
        </button>
      </div>

      {/* 输入框 */}
      <div className="ai-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="ai-input"
          placeholder={lang === 'zh' ? '告诉我你想做什么...' : 'Tell me what you want to do...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="ai-btn-send"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? (
            <svg className="ai-send-loading" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default AiAssistantPage;

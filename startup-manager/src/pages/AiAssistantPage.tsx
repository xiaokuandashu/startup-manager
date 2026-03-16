import React, { useState, useRef, useEffect } from 'react';
import { StartupTask } from '../types';
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

const CHAT_STORAGE_KEY = 'ai_chat_history';
const TASKS_STORAGE_KEY = 'startup_tasks';

// 本地模型列表
const LOCAL_MODELS = [
  { id: 'rule_engine', name: '📐 本地规则引擎', size: '内置', desc: '关键词匹配，离线可用，速度最快', builtin: true },
  { id: 'deepseek_cloud', name: '☁️ DeepSeek 云端', size: '在线', desc: '理解复杂指令，需要网络', builtin: true },
  { id: 'qwen2_1.5b', name: '🧠 Qwen2.5-1.5B', size: '1.1GB', desc: '通义千问小模型，中文表现好', builtin: false },
  { id: 'phi3_mini', name: '🧠 Phi-3 Mini', size: '2.2GB', desc: '微软小模型，推理能力强', builtin: false },
  { id: 'gemma2_2b', name: '🧠 Gemma 2 2B', size: '1.6GB', desc: 'Google 轻量级模型', builtin: false },
];

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

const WELCOME_MSG: ChatMessage = {
  id: 0,
  role: 'ai',
  content: '👋 你好！我是 AI 助手。\n\n告诉我你想做什么，我来帮你创建自动化任务。\n\n比如：「打开微信」「每天9点打开Chrome」「开机启动钉钉」',
  timestamp: Date.now(),
};

// 加载聊天历史
const loadChatHistory = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ChatMessage[];
      if (parsed.length > 0) return parsed;
    }
  } catch (e) { /* ignore */ }
  return [WELCOME_MSG];
};

// 保存聊天历史
const saveChatHistory = (messages: ChatMessage[]) => {
  try {
    // 过滤掉 loading 消息，保存最近 100 条
    const toSave = messages.filter(m => !m.loading).slice(-100);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) { /* ignore */ }
};

// 映射 AI 任务到 HomePage 的 StartupTask 格式
const mapToStartupTask = (task: AiTaskResult): StartupTask => {
  const timeTypeMap: Record<string, string> = {
    startup: '计算机启动时',
    once: '一次',
    daily: '每日循环',
    weekly: '每周',
    monthly: '每月',
  };
  const taskTypeMap: Record<string, string> = {
    application: '打开应用',
    script: '打开执行文件',
    path: '路径打开应用',
  };

  return {
    id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
    name: task.task_name,
    path: task.path,
    enabled: task.enabled,
    type: task.task_type === 'script' ? 'script' : 'application',
    taskType: taskTypeMap[task.task_type] || '打开应用',
    timeType: timeTypeMap[task.schedule_type] || '一次',
    executeTime: task.schedule_time || '',
    timeUntilExec: '',
    status: 'stopped' as const,
    note: `AI 创建 · ${timeTypeMap[task.schedule_type] || ''}`,
    fileExt: task.path.includes('.') ? '.' + task.path.split('.').pop() : undefined,
  };
};

const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ lang = 'zh', onAddTask }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModelPanel, setShowModelPanel] = useState(false);
  const [activeModel, setActiveModel] = useState('rule_engine');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 消息变化时保存到 localStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

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

      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        response = await invoke<AiResponse>('ai_parse_intent', { input: text });

        // 如果本地无法解析 且 用户选择了云端或未选择本地模型时，调用云端
        if (response.response_type === 'cloud_needed') {
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: '🌐 正在联系 DeepSeek 云端 AI...' } : m
          ));

          try {
            const cloudResult = await invoke<string>('ai_cloud_parse', { input: text });
            const cleanJson = cloudResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanJson) as AiResponse;
            response = parsed;
          } catch {
            response.message = '🤔 AI 云端暂时不可用，请试试更简单的表达方式。\n\n例如：「打开微信」「每天9点打开Chrome」';
            response.response_type = 'info';
          }
        }
      } else {
        response = {
          message: `📋 模拟解析：「${text}」\n\n这是开发模式，实际运行时将调用 AI 引擎。`,
          response_type: 'info',
          tasks: [],
        };
      }

      const aiMsg: ChatMessage = {
        id: loadingId,
        role: 'ai',
        content: response.message,
        tasks: response.tasks,
        responseType: response.response_type,
        timestamp: Date.now(),
      };
      setMessages(prev => prev.map(m => m.id === loadingId ? aiMsg : m));

    } catch {
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

  const handleAddTask = (task: AiTaskResult) => {
    if (onAddTask) {
      onAddTask(task);
    }

    // 保存到 startup_tasks（HomePage 使用的格式）
    try {
      const existing: StartupTask[] = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
      const newTask = mapToStartupTask(task);
      existing.push(newTask);
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(existing));

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        content: `✅ 任务「${task.task_name}」已添加到主页任务列表！\n\n切换到主页即可看到。`,
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
    const msg: ChatMessage = {
      id: Date.now(),
      role: 'ai',
      content: '👋 对话已清空。告诉我你想做什么吧！',
      timestamp: Date.now(),
    };
    setMessages([msg]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <div className="ai-page">
      {/* 顶部模型状态栏 */}
      <div className="ai-model-bar">
        <button className="ai-model-toggle" onClick={() => setShowModelPanel(!showModelPanel)}>
          <span className="ai-model-dot" />
          当前模型：{LOCAL_MODELS.find(m => m.id === activeModel)?.name || '规则引擎'}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginLeft: 4 }}>
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      {/* 模型选择面板 */}
      {showModelPanel && (
        <div className="ai-model-panel">
          <div className="ai-model-panel-title">选择 AI 模型</div>
          {LOCAL_MODELS.map(model => (
            <div
              key={model.id}
              className={`ai-model-item ${activeModel === model.id ? 'active' : ''}`}
              onClick={() => {
                if (model.builtin) {
                  setActiveModel(model.id);
                  setShowModelPanel(false);
                }
              }}
            >
              <div className="ai-model-item-left">
                <div className="ai-model-item-name">{model.name}</div>
                <div className="ai-model-item-desc">{model.desc}</div>
              </div>
              <div className="ai-model-item-right">
                {model.builtin ? (
                  activeModel === model.id ? (
                    <span className="ai-model-badge active">使用中</span>
                  ) : (
                    <span className="ai-model-badge">切换</span>
                  )
                ) : (
                  <span className="ai-model-badge download">
                    {model.size} · 待下载
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="ai-model-panel-note">
            💡 本地模型需要下载后才能使用（后续版本支持）
          </div>
        </div>
      )}

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
                              ✅ 添加到主页
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

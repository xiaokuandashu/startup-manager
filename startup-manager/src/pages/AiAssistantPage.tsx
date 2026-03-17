import React, { useState, useRef, useEffect } from 'react';
import { StartupTask } from '../types';
import { Language } from '../i18n';
import { ChevronDown, Send, Loader2, MessageCircle, Globe, Pin, ClipboardList, Rocket, Calendar, CalendarDays, CheckCircle2, Clock, Lightbulb, Trash2, User, Bot, Smartphone, FileCode, FolderOpen, Key, Settings as SettingsIcon } from 'lucide-react';

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

interface ModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  installed: boolean;
  downloading: boolean;
}

const QUICK_COMMANDS = [
  { label: '打开微信', icon: <MessageCircle size={14} /> },
  { label: '每天9点打开Chrome', icon: <Globe size={14} /> },
  { label: '开机启动钉钉', icon: <Pin size={14} /> },
  { label: '查看所有任务', icon: <ClipboardList size={14} /> },
  { label: '帮助', icon: <Lightbulb size={14} /> },
];

const SCHEDULE_LABELS: Record<string, React.ReactNode> = {
  startup: <><Rocket size={12} /> 开机启动</>,
  once: <><Clock size={12} /> 一次性</>,
  daily: <><Calendar size={12} /> 每天</>,
  weekly: <><CalendarDays size={12} /> 每周</>,
  monthly: <><CalendarDays size={12} /> 每月</>,
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
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineInstalled, setEngineInstalled] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [deepseekUsage, setDeepseekUsage] = useState<{remaining: number; daily_limit: number; has_custom_key: boolean}>({remaining: 100, daily_limit: 100, has_custom_key: false});
  const [showKeyPopup, setShowKeyPopup] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载模型列表
  useEffect(() => {
    loadModels();
    loadDeepseekUsage();
  }, []);

  const loadDeepseekUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const res = await fetch('https://bt.aacc.fun:8888/api/deepseek/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeepseekUsage(data);
      }
    } catch { /* silent */ }
  };

  const loadModels = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const status = await invoke<{ engine_installed: boolean; engine_running: boolean; models: ModelInfo[] }>('engine_status');
        setModels(status.models);
        setEngineRunning(status.engine_running);
        setEngineInstalled(status.engine_installed);
      }
    } catch { /* ignore */ }
  };

  const handlePullModel = async (modelId: string) => {
    setDownloadingModel(modelId);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('model_pull', { modelId });
        // 下载完成后自动启动引擎
        await invoke('engine_start', { modelId });
        await loadModels();
        setMessages(prev => [...prev, {
          id: Date.now(), role: 'ai',
          content: `✅ 模型下载完成并已启动！现在可以切换使用了。`,
          timestamp: Date.now(),
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'ai',
        content: `❌ 模型下载失败：${e}`,
        responseType: 'error', timestamp: Date.now(),
      }]);
    } finally {
      setDownloadingModel(null);
    }
  };

  const handleStartEngine = async (modelId: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('engine_start', { modelId });
        setTimeout(loadModels, 2000);
      }
    } catch { /* ignore */ }
  };

  // 消息变化时保存到 localStorage
  useEffect(() => {
    if (messages.length > 0) saveChatHistory(messages);
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

        // 根据选择的模型路由
        if (activeModel === 'rule_engine') {
          // 本地规则引擎
          response = await invoke<AiResponse>('ai_parse_intent', { input: text });

          if (response.response_type === 'cloud_needed') {
            setMessages(prev => prev.map(m =>
              m.id === loadingId ? { ...m, content: '🌐 正在联系 DeepSeek 云端 AI...' } : m
            ));
            try {
              const cloudResult = await invoke<string>('ai_cloud_parse', { input: text });
              const cleanJson = cloudResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              response = JSON.parse(cleanJson) as AiResponse;
            } catch {
              response.message = '🤔 AI 云端暂时不可用，请试试更简单的表达方式。';
              response.response_type = 'info';
            }
          }
        } else if (activeModel === 'deepseek_cloud') {
          // DeepSeek 云端（通过服务端代理 API）
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: '🌐 正在联系 DeepSeek 云端...' } : m
          ));
          try {
            const token = localStorage.getItem('auth_token');
            const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                messages: [{ role: 'user', content: text }],
              }),
            });
            if (proxyRes.status === 429) {
              const errData = await proxyRes.json();
              response = { message: `⚠️ ${errData.error}`, response_type: 'error', tasks: [] };
            } else if (proxyRes.status === 503) {
              const errData = await proxyRes.json();
              response = { message: `⚠️ ${errData.error}`, response_type: 'error', tasks: [] };
            } else if (proxyRes.ok) {
              const data = await proxyRes.json();
              const content = data.choices?.[0]?.message?.content || '';
              try {
                const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                response = JSON.parse(cleanJson) as AiResponse;
              } catch {
                response = { message: content || 'DeepSeek 返回了空响应', response_type: 'info', tasks: [] };
              }
              // 刷新剩余次数 — 先乐观递减，再从服务器刷新
              setDeepseekUsage(prev => ({ ...prev, remaining: Math.max(0, prev.remaining - 1) }));
              loadDeepseekUsage();
            } else {
              const errData = await proxyRes.json().catch(() => ({ error: `HTTP ${proxyRes.status}` }));
              response = { message: `❌ DeepSeek 云端错误: ${errData.error || proxyRes.statusText}`, response_type: 'error', tasks: [] };
            }
          } catch (e: any) {
            response = { message: `❌ DeepSeek 云端连接失败: ${e?.message || '网络错误，请检查服务器是否运行'}`, response_type: 'error', tasks: [] };
          }
        } else if (activeModel === 'deepseek_user') {
          // DeepSeek 自有密钥（通过服务端代理 API，自动使用用户密钥）
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: '🔑 正在使用您的 DeepSeek 密钥...' } : m
          ));
          try {
            const token = localStorage.getItem('auth_token');
            const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
            });
            if (proxyRes.ok) {
              const data = await proxyRes.json();
              const content = data.choices?.[0]?.message?.content || '';
              try {
                const cleanJson = content.replace(/```json\\n?/g, '').replace(/```\\n?/g, '').trim();
                response = JSON.parse(cleanJson) as AiResponse;
              } catch {
                response = { message: content || 'DeepSeek 返回了空响应', response_type: 'info', tasks: [] };
              }
            } else {
              const errData = await proxyRes.json().catch(() => ({ error: '连接失败' }));
              response = { message: `⚠️ ${errData.error || '请求失败'}`, response_type: 'error', tasks: [] };
            }
          } catch {
            response = { message: '❌ DeepSeek 连接失败', response_type: 'error', tasks: [] };
          }
        } else {
          // 本地内置引擎推理
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: `🧠 ${activeModel} 本地推理中...` } : m
          ));
          try {
            let inferResult: string | null = null;
            let lastError = '';
            const MAX_RETRIES = 5;
            const RETRY_DELAY = 5000;
            for (let retry = 0; retry < MAX_RETRIES; retry++) {
              try {
                inferResult = await invoke<string>('local_model_infer', { input: text });
                break;
              } catch (e) {
                lastError = String(e);
                if (String(e).includes('正在加载') && retry < MAX_RETRIES - 1) {
                  setMessages(prev => prev.map(m =>
                    m.id === loadingId ? { ...m, content: `⏳ 模型加载中，${RETRY_DELAY / 1000}秒后自动重试 (${retry + 1}/${MAX_RETRIES})...` } : m
                  ));
                  await new Promise(r => setTimeout(r, RETRY_DELAY));
                  continue;
                }
                break;
              }
            }
            if (inferResult) {
              const cleanJson = inferResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              response = JSON.parse(cleanJson) as AiResponse;
            } else {
              response = { message: `❌ 本地模型推理失败: ${lastError}`, response_type: 'error', tasks: [] };
            }
          } catch (e) {
            response = { message: `❌ 本地模型推理失败: ${e}`, response_type: 'error', tasks: [] };
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
        <button className="ai-model-toggle" onClick={() => { setShowModelPanel(!showModelPanel); loadModels(); }}>
          <span className={`ai-model-dot ${engineRunning ? '' : 'offline'}`} />
          当前模型：{models.find(m => m.id === activeModel)?.name || '本地规则引擎'}
          <ChevronDown size={14} style={{ marginLeft: 4 }} />
        </button>
      </div>

      {/* 模型选择面板 */}
      {showModelPanel && (
        <div className="ai-model-panel">
          <div className="ai-model-panel-title">
            选择 AI 模型
            <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: engineRunning ? '#22c55e' : '#9ca3af' }}>
              {engineRunning ? '● 引擎运行中' : engineInstalled ? '○ 引擎已安装' : '○ 引擎未安装'}
            </span>
          </div>
          {models.map(model => (
            <div
              key={model.id}
              className={`ai-model-item ${activeModel === model.id ? 'active' : ''}`}
              onClick={() => {
                if (model.installed) {
                  if (model.id !== 'rule_engine' && model.id !== 'deepseek_cloud') {
                    handleStartEngine(model.id);
                  }
                  setActiveModel(model.id);
                  setShowModelPanel(false);
                  if (model.id === 'deepseek_cloud') loadDeepseekUsage();
                } else if (!model.downloading && downloadingModel !== model.id) {
                  handlePullModel(model.id);
                }
              }}
            >
              <div className="ai-model-item-left">
                <div className="ai-model-item-name">{model.name}</div>
                <div className="ai-model-item-desc">
                  {model.description}
                  {model.id === 'deepseek_cloud' && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: deepseekUsage.has_custom_key ? '#22c55e' : '#f59e0b' }}>
                      {deepseekUsage.has_custom_key ? '· 自有密钥 · 无限制' : `· 剩余 ${deepseekUsage.remaining}/${deepseekUsage.daily_limit} 次`}
                    </span>
                  )}
                </div>
              </div>
              <div className="ai-model-item-right">
                {model.installed ? (
                  activeModel === model.id ? (
                    <span className="ai-model-badge active">使用中</span>
                  ) : (
                    <span className="ai-model-badge">切换</span>
                  )
                ) : downloadingModel === model.id ? (
                  <span className="ai-model-badge download">⏳ 下载中...</span>
                ) : (
                  <span className="ai-model-badge download">
                    {model.size} · 下载
                  </span>
                )}
              </div>
            </div>
          ))}
          {/* #14: 用户自有 DeepSeek 密钥模型 */}
          <div
            className={`ai-model-item ${activeModel === 'deepseek_user' ? 'active' : ''}`}
            onClick={() => {
              if (deepseekUsage.has_custom_key) {
                setActiveModel('deepseek_user');
                setShowModelPanel(false);
              } else {
                setShowModelPanel(false);
                setShowKeyPopup(true);
                setKeyInput('');
                setKeyMsg('');
              }
            }}
          >
            <div className="ai-model-item-left">
              <div className="ai-model-item-name"><Key size={14} style={{marginRight:4,verticalAlign:'middle'}} /> DeepSeek (自有密钥)</div>
              <div className="ai-model-item-desc">
                使用您自己的 API Key，无次数限制
                <span style={{ marginLeft: 6, fontSize: 10, color: deepseekUsage.has_custom_key ? '#22c55e' : '#9ca3af' }}>
                  {deepseekUsage.has_custom_key ? '· 已配置' : '· 未配置，点击去设置'}
                </span>
              </div>
            </div>
            <div className="ai-model-item-right">
              {deepseekUsage.has_custom_key ? (
                activeModel === 'deepseek_user' ? (
                  <span className="ai-model-badge active">使用中</span>
                ) : (
                  <span className="ai-model-badge">切换</span>
                )
              ) : (
                <span className="ai-model-badge" style={{color:'#9ca3af'}}><SettingsIcon size={12} style={{marginRight:2}} /> 去配置</span>
              )}
            </div>
          </div>
          <div className="ai-model-panel-note">
            <Lightbulb size={12} style={{marginRight:3,verticalAlign:'middle'}} /> 本地模型内置推理引擎，无需安装外部软件。点击模型即可自动下载并启动。
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-msg ai-msg-${msg.role}`}>
            <div className="ai-msg-avatar">
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
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
                              {task.task_type === 'application' ? <Smartphone size={14} style={{marginRight:3,verticalAlign:'middle'}} /> :
                               task.task_type === 'script' ? <FileCode size={14} style={{marginRight:3,verticalAlign:'middle'}} /> : <FolderOpen size={14} style={{marginRight:3,verticalAlign:'middle'}} />}
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
                              <CheckCircle2 size={14} style={{marginRight:3}} /> 添加到主页
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
          <Trash2 size={12} style={{marginRight:3}} /> 清空
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
            <Loader2 size={20} className="ai-send-loading" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {/* DeepSeek 密钥配置弹窗 */}
      {showKeyPopup && (
        <div className="modal-overlay" onClick={() => setShowKeyPopup(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
              <Key size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              配置 DeepSeek API 密钥
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              配置您自己的 API Key 后即可无限制使用 DeepSeek 模型
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="请输入 sk-... 开头的密钥"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            {keyMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 12,
                background: keyMsg.includes('✅') ? '#f0fdf4' : '#fef2f2',
                color: keyMsg.includes('✅') ? '#16a34a' : '#dc2626',
              }}>
                {keyMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="modal-btn-cancel"
                onClick={() => setShowKeyPopup(false)}
              >
                取消
              </button>
              <button
                className="modal-btn-confirm"
                disabled={keySaving || !keyInput.trim()}
                onClick={async () => {
                  setKeySaving(true);
                  setKeyMsg('');
                  try {
                    const token = localStorage.getItem('auth_token');
                    const res = await fetch('https://bt.aacc.fun:8888/api/auth/deepseek-key', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ deepseek_key: keyInput.trim() }),
                    });
                    if (res.ok) {
                      setKeyMsg('✅ 密钥配置成功');
                      loadDeepseekUsage();
                      setTimeout(() => {
                        setShowKeyPopup(false);
                        setActiveModel('deepseek_user');
                      }, 800);
                    } else {
                      const data = await res.json().catch(() => ({ error: '保存失败' }));
                      setKeyMsg(data.error || '保存失败');
                    }
                  } catch {
                    setKeyMsg('网络错误，请检查网络连接');
                  }
                  setKeySaving(false);
                }}
              >
                {keySaving ? '保存中...' : '保存密钥'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistantPage;

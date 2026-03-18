import React, { useState, useRef, useEffect } from 'react';
import { StartupTask } from '../types';
import { Language } from '../i18n';
import { ChevronDown, Send, Loader2, MessageCircle, Globe, Pin, ClipboardList, Rocket, Calendar, CalendarDays, CheckCircle2, Clock, Lightbulb, Trash2, User, Bot, Smartphone, FileCode, FolderOpen, Brain, Cpu, Cloud, Ruler, Download } from 'lucide-react';

interface AiTaskResult {
  task_name: string;
  task_type: string;
  path: string;
  schedule_type: string;
  schedule_time: string;
  schedule_days: number[];
  enabled: boolean;
  confidence: number;
  recording_name?: string;
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
    recordingId: task.recording_name || undefined,
    recordingName: task.recording_name || undefined,
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
  const [downloadingModel, setDownloadingModel] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [deepseekUsage, setDeepseekUsage] = useState<{remaining: number|null; daily_limit: number; has_custom_key: boolean}>({remaining: null, daily_limit: 100, has_custom_key: false});
  const [showKeyPopup, setShowKeyPopup] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 监听模型下载进度
  useEffect(() => {
    let unlisten: () => void = () => {};
    const setupListener = async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const { listen } = await import('@tauri-apps/api/event');
          const unlistenFn = await listen<{ model_id: string; progress: number }>('model_download_progress', (event) => {
            setDownloadProgress(prev => ({
              ...prev,
              [event.payload.model_id]: event.payload.progress
            }));
          });
          unlisten = unlistenFn;
        }
      } catch { /* silent */ }
    };
    setupListener();
    return () => { unlisten(); };
  }, []);

  // 加载模型列表 + 同步下载状态
  useEffect(() => {
    loadModels();
    loadDeepseekUsage();
    // 同步后台下载状态
    (async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const downloading: string[] = await invoke('get_downloading_models');
          if (downloading.length > 0) setDownloadingModel(new Set(downloading));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // 监听其他页面的密钥变更事件
  useEffect(() => {
    const handler = () => { loadDeepseekUsage(); };
    window.addEventListener('deepseek-key-changed', handler);
    return () => window.removeEventListener('deepseek-key-changed', handler);
  }, []);

  const loadDeepseekUsage = async () => {
    try {
      const token = localStorage.getItem('token');
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
    setDownloadingModel(prev => new Set(prev).add(modelId));
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
        content: `❌ 模型下载失败：${e}\n\n💡 建议：前往 **设置 → 本地模型管理** 切换模型下载源后重试`,
        responseType: 'error', timestamp: Date.now(),
      }]);
    } finally {
      setDownloadingModel(prev => { const n = new Set(prev); n.delete(modelId); return n; });
    }
  };

  const handleStartEngine = async (modelId: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('engine_start', { modelId });
        setTimeout(loadModels, 2000);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'ai',
        content: `❌ 引擎启动失败：${e}`,
        responseType: 'error', timestamp: Date.now(),
      }]);
    }
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
            const token = localStorage.getItem('token');
            const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                model: 'deepseek_cloud',
                messages: [{ role: 'user', content: text }],
              }),
            });
            if (proxyRes.status === 429) {
              const errData = await proxyRes.json();
              response = { message: `⚠️ ${errData.error}`, response_type: 'error', tasks: [] };
            } else if (proxyRes.status === 503) {
              const errData = await proxyRes.json();
              response = { message: `⚠️ ${errData.error}`, response_type: 'error', tasks: [] };
            } else if (proxyRes.status === 401) {
              response = { message: `⚠️ 登录已过期，请退出重新登录后再试`, response_type: 'error', tasks: [] };
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
              setDeepseekUsage(prev => ({ ...prev, remaining: Math.max(0, (prev.remaining ?? 100) - 1) }));
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
            const token = localStorage.getItem('token');
            const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                model: 'deepseek_user',
                messages: [{ role: 'user', content: text }],
              }),
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

  const handleAddTask = async (task: AiTaskResult) => {
    if (onAddTask) {
      onAddTask(task);
    }

    // 保存到 startup_tasks（HomePage 使用的格式）
    try {
      const existing: StartupTask[] = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
      const newTask = mapToStartupTask(task);

      // 自动匹配录制动作
      if (task.recording_name) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const recList = await invoke<{name:string}[]>('recording_list');
          const match = recList?.find(r => r.name.includes(task.recording_name!) || task.recording_name!.includes(r.name));
          if (match) {
            newTask.recordingId = match.name;
            newTask.recordingName = match.name;
          }
        } catch { /* 无录制列表时忽略 */ }
      }

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
          <span className={`ai-model-dot ${engineRunning || activeModel === 'deepseek_cloud' || activeModel === 'deepseek_user' ? '' : 'offline'}`} />
          当前模型：
          {activeModel === 'rule_engine' ? (
            '请选择 AI 模型'
          ) : activeModel === 'deepseek_cloud' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Cloud size={14} style={{marginRight:4,opacity:0.7}} />
              DeepSeek 云端
              <span style={{ marginLeft: 6, padding: '1px 6px', background: '#fef3c7', color: '#b45309', borderRadius: 10, fontSize: 10, fontWeight: 500 }}>官方</span>
            </span>
          ) : activeModel === 'deepseek_user' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Cloud size={14} style={{marginRight:4,opacity:0.7}} />
              DeepSeek 云端
              <span style={{ marginLeft: 6, padding: '1px 6px', background: '#dcfce7', color: '#166534', borderRadius: 10, fontSize: 10, fontWeight: 500 }}>自己</span>
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Brain size={14} style={{marginRight:4,opacity:0.7}} />
              {(models.find(m => m.id === activeModel)?.name || '未知模型').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '')}
              <span style={{ marginLeft: 6, padding: '1px 6px', background: '#eff6ff', color: '#3b82f6', borderRadius: 10, fontSize: 10, fontWeight: 500 }}>本地</span>
            </span>
          )}
          <ChevronDown size={14} style={{ marginLeft: 4 }} />
        </button>
      </div>

      {/* 模型选择面板 */}
      {showModelPanel && (
        <div className="ai-model-panel">
          <div className="ai-model-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              选择 AI 模型
              <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: engineRunning ? '#22c55e' : '#9ca3af' }}>
                {engineRunning ? '● 引擎运行中' : engineInstalled ? '○ 引擎已安装' : '○ 引擎未安装'}
              </span>
            </div>
            <button
              onClick={() => setShowModelPanel(false)}
              className="modal-close"
              aria-label="关闭"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.color = '#475569';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {models.filter(m => m.id !== 'rule_engine').map(model => (
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
                } else if (!model.downloading && !downloadingModel.has(model.id)) {
                  handlePullModel(model.id);
                }
              }}
            >
              <div className="ai-model-item-left">
                <div className="ai-model-item-name">
                  {(() => {
                    const icons: Record<string, any> = { 'deepseek_cloud': Cloud, 'rule_engine': Ruler, 'qwen2.5-1.5b': Brain, 'phi3-mini': Brain, 'gemma2-2b': Brain };
                    const Icon = icons[model.id] || Cpu;
                    return <Icon size={13} style={{marginRight:5,verticalAlign:'middle',opacity:0.7}} />;
                  })()}
                  {model.id === 'deepseek_cloud' ? 'DeepSeek 云端' : model.name.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '')}
                  {model.id === 'deepseek_cloud' ? (
                    <span style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      padding: '1px 6px',
                      background: '#fef3c7',
                      color: '#b45309',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 500,
                      verticalAlign: 'middle',
                    }}>官方</span>
                  ) : model.id !== 'rule_engine' ? (
                    <span style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      padding: '1px 6px',
                      background: '#eff6ff',
                      color: '#3b82f6',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 500,
                      verticalAlign: 'middle',
                    }}>本地</span>
                  ) : null}
                </div>
                <div className="ai-model-item-desc">
                  {model.description}
                </div>
                {model.id === 'deepseek_cloud' && (
                  <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {deepseekUsage.remaining === null ? `每日 ${deepseekUsage.daily_limit} 次调用 · 今日剩余 N次` : `每日 ${deepseekUsage.daily_limit} 次调用 · 今日剩余 ${deepseekUsage.remaining} 次`}
                    <button onClick={(e) => { e.stopPropagation(); loadDeepseekUsage(); }} style={{background:'none',border:'1px solid var(--border-color)',borderRadius:4,cursor:'pointer',padding:'1px 5px',fontSize:10,color:'var(--text-secondary)'}} title="刷新">↻</button>
                  </div>
                )}
              </div>
              <div className="ai-model-item-right">
                {model.installed ? (
                  activeModel === model.id ? (
                    <span className="ai-model-badge active">使用中</span>
                  ) : (
                    <span className="ai-model-badge">切换</span>
                  )
                ) : downloadingModel.has(model.id) ? (
                  <span className="ai-model-badge download" style={{display:'inline-flex',alignItems:'center'}}><Loader2 size={12} style={{marginRight:3,animation:'spin 1s linear infinite'}} /> 下载中... {downloadProgress[model.id] || 0}%</span>
                ) : (
                  <span className="ai-model-badge download">
                    <Download size={12} style={{marginRight:3}} /> {model.size} · 下载
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
                // 展开内联输入，不弹窗
                setShowKeyPopup(true);
                setKeyInput('');
                setKeyMsg('');
              }
            }}
          >
            <div className="ai-model-item-left">
              {deepseekUsage.has_custom_key ? (
                <>
                  <div className="ai-model-item-name">
                    <Cloud size={13} style={{marginRight:5,verticalAlign:'middle',opacity:0.7}} />
                    DeepSeek 云端
                    <span style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      padding: '1px 6px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 500,
                      verticalAlign: 'middle',
                    }}>自己</span>
                  </div>
                  <div className="ai-model-item-desc">
                    理解复杂指令，需要网络
                    <span style={{ color: '#22c55e' }}> · 自有密钥 · 无限制</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="ai-model-item-name">
                    <Cloud size={13} style={{marginRight:5,verticalAlign:'middle',opacity:0.7}} />
                    DeepSeek 云端
                    <span style={{
                      display: 'inline-block',
                      marginLeft: 8,
                      padding: '1px 6px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 500,
                      verticalAlign: 'middle',
                    }}>自己</span>
                  </div>
                  <div className="ai-model-item-desc">
                    理解复杂指令，需要网络
                    <span style={{ color: '#9ca3af' }}> · 未配置，点击配置</span>
                  </div>
                </>
              )}
            </div>
            <div className="ai-model-item-right">
              {deepseekUsage.has_custom_key ? (
                activeModel === 'deepseek_user' ? (
                  <span className="ai-model-badge active">使用中</span>
                ) : (
                  <span className="ai-model-badge">切换</span>
                )
              ) : (
                <span className="ai-model-badge" style={{color:'#3b82f6', background: '#eff6ff', padding: '4px 10px', borderRadius: '4px'}}>配置密钥</span>
              )}
            </div>
          </div>
          {/* 内联密钥输入区 */}
          {showKeyPopup && !deepseekUsage.has_custom_key && (
            <div onClick={e => e.stopPropagation()} style={{
              padding: '12px 16px', background: '#f8fafc', borderRadius: 8,
              margin: '-4px 0 8px', border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>API Key</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="sk-..."
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 6,
                    border: '1px solid #e5e7eb', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  disabled={keySaving || !keyInput.trim()}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setKeySaving(true);
                    setKeyMsg('');
                    try {
                      const token = localStorage.getItem('token');
                      const keyRes = await fetch('https://bt.aacc.fun:8888/api/activation/profile/deepseek-key', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ key: keyInput.trim() }),
                      });
                      if (keyRes.ok) {
                        setKeyMsg('✅ 已保存');
                        loadDeepseekUsage();
                        const k = keyInput.trim();
                        const masked = k.length > 8 ? k.substring(0,4) + '****' + k.substring(k.length-4) : '****';
                        window.dispatchEvent(new CustomEvent('deepseek-key-changed', { detail: { hasKey: true, masked } }));
                        setTimeout(() => {
                          setShowKeyPopup(false);
                          setActiveModel('deepseek_user');
                          setKeyInput('');
                          setKeyMsg('');
                        }, 600);
                      } else {
                        const data = await keyRes.json().catch(() => ({ error: '保存失败' }));
                        setKeyMsg(data.error || '保存失败');
                      }
                    } catch {
                      setKeyMsg('网络错误');
                    }
                    setKeySaving(false);
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 6, border: 'none',
                    background: keySaving || !keyInput.trim() ? '#94a3b8' : '#3b82f6',
                    color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    cursor: keySaving || !keyInput.trim() ? 'not-allowed' : 'pointer',
                  }}
                >{keySaving ? '...' : '保存'}</button>
              </div>
              {keyMsg && (
                <div style={{ fontSize: 11, marginTop: 4, color: keyMsg.includes('✅') ? '#16a34a' : '#dc2626' }}>
                  {keyMsg}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                配置后使用云端模型无次数限制，消耗您自己的 token
              </div>
            </div>
          )}
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
                          {task.recording_name && (
                            <div className="ai-task-card-path" style={{ color: '#0066cc', marginTop: 4 }}>
                              <Bot size={12} style={{marginRight:3,verticalAlign:'middle'}} />
                              附带录制动作: {task.recording_name}
                            </div>
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

    </div>
  );
};

export default AiAssistantPage;

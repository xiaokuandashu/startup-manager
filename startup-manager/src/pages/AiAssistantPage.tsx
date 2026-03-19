import React, { useState, useRef, useEffect } from 'react';
import { StartupTask, TaskStep } from '../types';
import { Language } from '../i18n';
import { ChevronDown, Send, Loader2, Globe, ClipboardList, Rocket, Calendar, CalendarDays, CheckCircle2, Clock, Lightbulb, Trash2, User, Bot, Smartphone, FileCode, FolderOpen, Brain, Cpu, Cloud, Ruler, Download, Link2, Play, Timer, Terminal, ArrowDown, ImagePlus } from 'lucide-react';

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
  steps?: TaskStep[];  // Phase 2: 链式任务步骤
}

interface AiResponse {
  message: string;
  response_type: string;
  tasks: AiTaskResult[];
  execute_command?: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  content: string;
  tasks?: AiTaskResult[];
  responseType?: string;
  executedCommand?: string; // 记录执行过的命令，用于"存为任务"
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
  { label: '每天8:20打开微信，执行打卡动作', icon: <Smartphone size={14} /> },
  { label: '打开钉钉签到，等5分钟后关闭', icon: <Clock size={14} /> },
  { label: '开机依次启动3个应用', icon: <Rocket size={14} /> },
  { label: '每天9点打开Chrome截图保存', icon: <Globe size={14} /> },
  { label: '查看我的录制动作列表', icon: <ClipboardList size={14} /> },
  { label: '帮助', icon: <Lightbulb size={14} /> },
];

const SCHEDULE_LABELS: Record<string, React.ReactNode> = {
  startup: <><Rocket size={12} /> 开机启动</>,
  once: <><Clock size={12} /> 一次性</>,
  daily: <><Calendar size={12} /> 每天</>,
  weekly: <><CalendarDays size={12} /> 每周</>,
  monthly: <><CalendarDays size={12} /> 每月</>,
};

// Phase 2: 步骤类型对应的图标和标签
const STEP_TYPE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  open_app: { icon: <Smartphone size={14} />, label: '打开应用' },
  wait: { icon: <Timer size={14} />, label: '等待' },
  playback_recording: { icon: <Play size={14} />, label: '播放录制' },
  execute_script: { icon: <Terminal size={14} />, label: '执行脚本' },
  file_action: { icon: <FolderOpen size={14} />, label: '文件操作' },
  vision_caption: { icon: <Brain size={14} />, label: '图片理解' },
  browser_action: { icon: <Globe size={14} />, label: '浏览器操作' },
};

const WELCOME_MSG: ChatMessage = {
  id: 0,
  role: 'ai',
  content: '👋 你好！我是任务精灵 AI 助手。\n\n我可以帮你创建**简单或复杂**的自动化任务：\n\n🔹 简单：「每天9点打开Chrome」\n🔹 复杂：「每天8:20打开微信，执行动作1，等10分钟，执行动作2」\n🔹 链式：「开机启动钉钉 + 企业微信 + 飞书」\n\n试试下面的快捷指令 👇',
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
    chain: '链式任务',
  };

  return {
    id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
    name: task.task_name,
    path: task.path || '',
    enabled: task.enabled,
    type: task.task_type === 'script' ? 'script' : 'application',
    taskType: taskTypeMap[task.task_type] || '打开应用',
    timeType: timeTypeMap[task.schedule_type] || '一次',
    executeTime: task.schedule_time || '',
    timeUntilExec: '',
    status: 'stopped' as const,
    note: `AI 创建 · ${timeTypeMap[task.schedule_type] || ''}${task.steps ? ` · ${task.steps.length}步` : ''}`,
    fileExt: task.path?.includes('.') ? '.' + task.path.split('.').pop() : undefined,
    recordingId: task.recording_name || undefined,
    recordingName: task.recording_name || undefined,
    steps: task.steps || undefined,
  };
};

// Phase 2: JSON 容错解析器（处理本地小模型的格式错误）
function safeParseJSON(raw: string): Record<string, unknown> | null {
  // 直接解析
  try { return JSON.parse(raw); } catch {}
  // 提取 JSON 块
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  // 修复常见错误（末尾多余逗号）
  if (match) {
    const fixed = match[0].replace(/,\s*([}\]])/g, '$1');
    try { return JSON.parse(fixed); } catch {}
  }
  return null;
}

const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ lang = 'zh', onAddTask }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModelPanel, setShowModelPanel] = useState(false);
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem('ai_active_model') || 'deepseek_cloud');
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
  // OpenClaw 状态
  const [openclawStatus, setOpenclawStatus] = useState<{installed: boolean; running: boolean; version: string}>({installed: false, running: false, version: ''});
  const [authConfirm, setAuthConfirm] = useState<{visible: boolean; prompt: string; level: string; confirmCount: number}>({visible: false, prompt: '', level: '', confirmCount: 0});
  const [webSearchEnabled, setWebSearchEnabled] = useState(() => localStorage.getItem('ai_web_search') === 'true');
  const [localExecEnabled, setLocalExecEnabled] = useState(() => {
    const saved = localStorage.getItem('ai_local_exec');
    return saved === null ? true : saved === 'true'; // 默认开启
  });
  const [thinkingExpanded, setThinkingExpanded] = useState(() => localStorage.getItem('ai_thinking_expanded') === 'true');
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
        // 同时检查 OpenClaw 状态
        try {
          const ocStatus = await invoke<{installed: boolean; running: boolean; version: string; port: number}>('openclaw_status');
          setOpenclawStatus(ocStatus);
        } catch { /* openclaw not available */ }
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
      let response: AiResponse | undefined = undefined;
      let aiInput = text;
      let executedCommand = '';

      // ========== 步骤0: 本地命令预检测（关键词→直接执行，不依赖 AI 判断）==========
      const isMac = navigator.platform.includes('Mac');
      const LOCAL_CMD_PATTERNS: {keywords: string[]; cmd?: string; cmdFn?: (t: string) => string}[] = [
        { keywords: ['桌面文件', '桌面上文件', '桌面上的', '整理桌面', '桌面清单', '桌面列表'], cmd: isMac ? 'ls -la ~/Desktop' : 'dir %USERPROFILE%\\Desktop' },
        { keywords: ['配置', '硬件', '系统信息', '电脑信息', '电脑配置', '什么型号'], cmd: isMac ? 'system_profiler SPHardwareDataType' : 'systeminfo' },
        { keywords: ['内存', '运行内存', 'RAM'], cmd: isMac ? 'sysctl hw.memsize && vm_stat | head -10' : 'wmic memorychip get capacity' },
        { keywords: ['硬盘', '磁盘', '存储', '剩余空间'], cmd: isMac ? 'df -h' : 'wmic diskdrive get size,model' },
        { keywords: ['CPU', '处理器', 'cpu'], cmd: isMac ? 'sysctl -n machdep.cpu.brand_string && sysctl -n hw.ncpu' : 'wmic cpu get name' },
        { keywords: ['进程', '运行中', '占用'], cmd: isMac ? 'ps aux | head -20' : 'tasklist | more' },
        { keywords: ['网络', 'IP', '网卡', 'ip'], cmd: isMac ? 'ifconfig | grep inet' : 'ipconfig' },
        { keywords: ['创建文件夹', '新建文件夹'], cmdFn: (t) => {
          const name = t.match(/叫[\s「」"]*([^\s「」"]+)/)?.[1] || t.match(/建[\s「」"]*([^\s「」"]+)/)?.[1] || 'new_folder';
          return isMac ? `mkdir -p ~/Desktop/${name}` : `mkdir %USERPROFILE%\\Desktop\\${name}`;
        }},
      ];

      // 深度思考模型列表（这些模型不跳过推理，以生成 <think> 标签）
      const DEEP_THINKING_MODELS = ['deepseek-r1-1.5b', 'nanbeige-3b', 'phi4-mini', 'deepseek_cloud', 'deepseek_user'];
      const isDeepThinkingModel = DEEP_THINKING_MODELS.includes(activeModel);
      let detectedCmd = ''; // 关键词检测到的命令（作为 hint 或 fallback）

      if (localExecEnabled && (window as any).__TAURI_INTERNALS__) {
        const matched = LOCAL_CMD_PATTERNS.find(p => p.keywords.some(k => text.includes(k)));
        if (matched) {
          detectedCmd = matched.cmdFn ? matched.cmdFn(text) : matched.cmd!;
          if (!isDeepThinkingModel) {
            // 非深度思考模型: 直接执行，跳过 AI
            response = { message: '正在执行...', response_type: 'execute', execute_command: detectedCmd, tasks: [] };
          }
          // 深度思考模型: 不跳过，让模型思考，detectedCmd 作为 fallback
        }
      }

      // ========== 步骤1: 联网搜索（注入真实时间）==========
      const now = new Date();
      const weekDays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
      const timeStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${weekDays[now.getDay()]} ${now.toLocaleTimeString('zh-CN')}`;

      if (webSearchEnabled && !response) {
        // 如果是 DeepSeek 云端，不做单独搜索调用（避免消耗 2 次），直接注入时间到主调用
        if (activeModel === 'deepseek_cloud' || activeModel === 'deepseek_user') {
          aiInput = `[当前时间: ${timeStr}]

${text}

请根据以上真实时间回答。`;
        } else {
          // 本地模型: 用 DeepSeek 搜索一次获取信息
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: '🌐 联网搜索中...' } : m
          ));
          try {
            const token = localStorage.getItem('token');
            const searchRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                messages: [
                  { role: 'system', content: `你是智能助手。当前确切时间是: ${timeStr}。根据用户问题回答，必须使用以上真实时间。回答控制在200字内。` },
                  { role: 'user', content: text }
                ]
              }),
            });
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const summary = searchData.choices?.[0]?.message?.content || '';
              if (summary) {
                aiInput = `[实时信息]
当前时间: ${timeStr}
搜索结果: ${summary}

[用户问题] ${text}

请结合以上信息回答用户。时间信息以上面的“当前时间”为准。`;
              }
            }
          } catch { /* search failed, use original */ }
        }
      }

      // ========== 步骤2: AI 大脑推理（仅在未被预检测拦截时）==========
      if (!response && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');

        if (activeModel === 'deepseek_cloud' || activeModel === 'deepseek_user') {
          // DeepSeek 云端
          const modelLabel = activeModel === 'deepseek_user' ? '🔑 您的密钥' : '☁️ DeepSeek 云端';
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: `${modelLabel} 思考中...` } : m
          ));
          try {
            const token = localStorage.getItem('token');
            const proxyRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                model: activeModel,
                messages: [
                  { role: 'system', content: `你是「任务精灵」AI助手，不是DeepSeek，不是其他任何模型。当用户问你是谁时，回答“我是任务精灵AI助手”。当前时间: ${timeStr}。` },
                  { role: 'user', content: aiInput }
                ],
              }),
            });
            if (proxyRes.status === 429) {
              const errData = await proxyRes.json();
              response = { message: `⚠️ ${errData.error}`, response_type: 'error', tasks: [] };
            } else if (proxyRes.status === 401) {
              response = { message: `⚠️ 登录已过期，请退出重新登录后再试`, response_type: 'error', tasks: [] };
            } else if (proxyRes.ok) {
              const data = await proxyRes.json();
              const content = data.choices?.[0]?.message?.content || '';
              const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const parsed = safeParseJSON(cleanJson);
              if (parsed && (parsed as any).message) {
                response = parsed as unknown as AiResponse;
              } else {
                response = { message: content || 'DeepSeek 返回了空响应', response_type: 'info', tasks: [] };
              }
              if (activeModel === 'deepseek_cloud') {
                setDeepseekUsage(prev => ({ ...prev, remaining: Math.max(0, (prev.remaining ?? 100) - 1) }));
                loadDeepseekUsage();
              }
            } else {
              const errData = await proxyRes.json().catch(() => ({ error: `HTTP ${proxyRes.status}` }));
              response = { message: `❌ 云端错误: ${errData.error || proxyRes.statusText}`, response_type: 'error', tasks: [] };
            }
          } catch (e: any) {
            response = { message: `❌ 云端连接失败: ${e?.message || '网络错误'}`, response_type: 'error', tasks: [] };
          }
        } else {
          // 本地模型推理
          setMessages(prev => prev.map(m =>
            m.id === loadingId ? { ...m, content: `🧠 本地模型推理中...` } : m
          ));
          try {
            let inferResult: string | null = null;
            let lastError = '';
            const MAX_RETRIES = 5;
            const RETRY_DELAY = 5000;
            for (let retry = 0; retry < MAX_RETRIES; retry++) {
              try {
                inferResult = await invoke<string>('local_model_infer', { input: aiInput });
                break;
              } catch (e) {
                lastError = String(e);
                if (String(e).includes('正在加载') && retry < MAX_RETRIES - 1) {
                  setMessages(prev => prev.map(m =>
                    m.id === loadingId ? { ...m, content: `⏳ 模型加载中 (${retry + 1}/${MAX_RETRIES})...` } : m
                  ));
                  await new Promise(r => setTimeout(r, RETRY_DELAY));
                  continue;
                }
                break;
              }
            }
            if (inferResult) {
              const cleanJson = inferResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const parsed = safeParseJSON(cleanJson);
              if (parsed && (parsed as any).message) {
                response = parsed as unknown as AiResponse;
              } else {
                response = { message: cleanJson || inferResult, response_type: 'info', tasks: [] };
              }
            } else {
              response = { message: `❌ 本地模型推理失败: ${lastError}`, response_type: 'error', tasks: [] };
            }
          } catch (e) {
            response = { message: `❌ 本地模型推理失败: ${e}`, response_type: 'error', tasks: [] };
          }
        }
      } else if (!response) {
        response = { message: `📋 开发模式：「${text}」`, response_type: 'info', tasks: [] };
      }

      // 确保 response 已赋值
      if (!response) {
        response = { message: '🤔 未能理解你的请求，请换个方式试试。', response_type: 'info', tasks: [] };
      }

      // 深度思考模型 fallback: 如果模型没返回 execute 但关键词检测到了命令，用检测到的命令
      if (detectedCmd && response.response_type !== 'execute' && localExecEnabled) {
        // 保留模型的回答（可能含 <think>），但追加执行
        response.execute_command = detectedCmd;
        response.response_type = 'execute';
      }

      // ========== 步骤3: 本地执行（当开关开启 + AI 返回 execute 类型）==========
      if (localExecEnabled && response.response_type === 'execute' && response.execute_command) {
        const execCmd = response.execute_command;
        executedCommand = execCmd;
        setMessages(prev => prev.map(m =>
          m.id === loadingId ? { ...m, content: `⚙️ 正在执行: \`${execCmd}\`...` } : m
        ));
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          // 优先用 OpenClaw（更强大），降级到 execute_script
          let execResult = '';
          if (openclawStatus.running) {
            try {
              const clawResult = await invoke<{success: boolean; output: string; requires_auth: boolean; auth_level: string}>('openclaw_execute', { prompt: execCmd });
              if (clawResult.requires_auth) {
                setAuthConfirm({ visible: true, prompt: execCmd, level: clawResult.auth_level, confirmCount: 0 });
                response.message = '⚠️ 此操作需要您的授权，请在弹窗中确认。';
                response.response_type = 'info';
                executedCommand = '';
              } else {
                execResult = clawResult.output;
              }
            } catch {
              // OpenClaw 失败，降级到 execute_script
              execResult = await invoke<string>('execute_script', {
                scriptContent: execCmd,
                scriptType: navigator.platform.includes('Mac') ? 'bash' : 'powershell'
              });
            }
          } else {
            execResult = await invoke<string>('execute_script', {
              scriptContent: execCmd,
              scriptType: navigator.platform.includes('Mac') ? 'bash' : 'powershell'
            });
          }
          if (execResult) {
            // 保留模型的思考过程（<think>标签）+ 追加执行结果
            const thinkPart = response.message.match(/<think>[\s\S]*?<\/think>/)?.[0] || '';
            response.message = `${thinkPart}\n✅ 执行完成\n\n\`\`\`\n$ ${execCmd}\n${execResult}\`\`\``;
            response.response_type = 'info';
          }
        } catch (execErr) {
          response.message = `❌ 执行失败: ${execErr}\n\n命令: \`${execCmd}\``;
          response.response_type = 'error';
          executedCommand = '';
        }
      } else if (!localExecEnabled && response.response_type === 'execute') {
        // 本地执行关闭时，把命令告诉用户但不执行
        response.message = `🔧 建议执行以下命令：\n\n\`\`\`\n${response.execute_command}\`\`\`\n\n（本地执行已关闭，请手动执行或开启本地执行开关）`;
        response.response_type = 'info';
      }

      // ========== 步骤4: 构建消息 ==========
      const aiMsg: ChatMessage = {
        id: loadingId,
        role: 'ai',
        content: response.message,
        tasks: response.tasks,
        responseType: response.response_type,
        executedCommand: executedCommand || undefined,
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

      // 自动匹配录制动作（简单任务）
      if (task.recording_name && !task.steps) {
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

      // Phase 2: 链式任务中的录制动作匹配
      if (newTask.steps && newTask.steps.length > 0) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const recList = await invoke<{name:string}[]>('recording_list');
          if (recList && recList.length > 0) {
            newTask.steps = newTask.steps.map(step => {
              if (step.type === 'playback_recording' && step.recording_name) {
                const match = recList.find(r => r.name.includes(step.recording_name!) || step.recording_name!.includes(r.name));
                if (match) {
                  return { ...step, recording_id: match.name, recording_name: match.name };
                }
              }
              return step;
            });
          }
        } catch { /* 无录制列表时忽略 */ }
      }

      existing.push(newTask);
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(existing));

      const stepInfo = newTask.steps ? `\n包含 ${newTask.steps.length} 个执行步骤。` : '';
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ai',
        content: `✅ 任务「${task.task_name}」已添加到主页任务列表！${stepInfo}\n\n切换到主页即可看到。`,
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
      <div className="ai-model-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button className="ai-model-toggle" onClick={() => { setShowModelPanel(!showModelPanel); loadModels(); }}>
          <span className={`ai-model-dot ${engineRunning || activeModel === 'deepseek_cloud' || activeModel === 'deepseek_user' ? '' : 'offline'}`} />
          当前模型：
          {activeModel === 'deepseek_cloud' ? (
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
          ) : activeModel === 'rule_engine' ? (
            '请选择 AI 模型'
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Brain size={14} style={{marginRight:4,opacity:0.7}} />
              {(models.find(m => m.id === activeModel)?.name || '本地模型').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '')}
              <span style={{ marginLeft: 6, padding: '1px 6px', background: '#eff6ff', color: '#3b82f6', borderRadius: 10, fontSize: 10, fontWeight: 500 }}>本地</span>
            </span>
          )}
          <ChevronDown size={14} style={{ marginLeft: 4 }} />
        </button>

        {/* 独立能力开关 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => { setLocalExecEnabled(!localExecEnabled); localStorage.setItem('ai_local_exec', String(!localExecEnabled)); }}
            title={localExecEnabled ? '本地执行已开启（点击关闭）' : '本地执行已关闭（点击开启）'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
              minWidth: 88, justifyContent: 'center',
              background: localExecEnabled ? '#dcfce7' : 'var(--card-bg, #f3f4f6)',
              color: localExecEnabled ? '#166534' : 'var(--text-secondary, #9ca3af)',
            }}
          >
            <Terminal size={12} />
            本地执行
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: localExecEnabled ? '#22c55e' : '#d1d5db', display: 'inline-block', marginLeft: 2, transition: 'background 0.2s' }} />
          </button>
          <button
            onClick={() => { setWebSearchEnabled(!webSearchEnabled); localStorage.setItem('ai_web_search', String(!webSearchEnabled)); }}
            title={webSearchEnabled ? '联网搜索已开启（点击关闭）' : '联网搜索已关闭（点击开启）'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
              minWidth: 88, justifyContent: 'center',
              background: webSearchEnabled ? '#dcfce7' : 'var(--card-bg, #f3f4f6)',
              color: webSearchEnabled ? '#166534' : 'var(--text-secondary, #9ca3af)',
            }}
          >
            <Globe size={12} />
            联网搜索
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: webSearchEnabled ? '#22c55e' : '#d1d5db', display: 'inline-block', marginLeft: 2, transition: 'background 0.2s' }} />
          </button>
        </div>
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
                  localStorage.setItem('ai_active_model', model.id);
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
                  <div className="ai-msg-text">
                    {(() => {
                      // 解析 <think>...</think> 标签（深度思考过程）
                      const thinkMatch = msg.content.match(/<think>(.*?)<\/think>/s);
                      const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';
                      const mainContent = thinkMatch
                        ? msg.content.replace(/<think>.*?<\/think>/s, '').trim()
                        : msg.content;
                      return (
                        <>
                          {thinkContent && (
                            <div style={{ marginBottom: 8 }}>
                              <button
                                onClick={() => {
                                  const next = !thinkingExpanded;
                                  setThinkingExpanded(next);
                                  localStorage.setItem('ai_thinking_expanded', String(next));
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  background: 'none', border: '1px solid var(--border-color, #e5e7eb)',
                                  borderRadius: 8, padding: '4px 10px', fontSize: 11,
                                  color: 'var(--text-secondary, #9ca3af)', cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                              >
                                💭 {thinkingExpanded ? '收起推理过程 ▲' : '查看推理过程 ▼'}
                              </button>
                              {thinkingExpanded && (
                                <div style={{
                                  marginTop: 6, padding: '8px 12px', borderRadius: 8,
                                  background: 'var(--hover-bg, #f8f9fa)', fontSize: 12,
                                  color: 'var(--text-secondary, #6b7280)', lineHeight: 1.6,
                                  borderLeft: '3px solid #d1d5db', whiteSpace: 'pre-wrap',
                                }}>
                                  {thinkContent}
                                </div>
                              )}
                            </div>
                          )}
                          <div dangerouslySetInnerHTML={{
                            __html: mainContent
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/`(.*?)`/g, '<code>$1</code>')
                              .replace(/\n/g, '<br/>')
                          }} />
                        </>
                      );
                    })()}
                  </div>
                  {msg.tasks && msg.tasks.length > 0 && (
                    <div className="ai-task-cards">
                      {msg.tasks.map((task, i) => (
                        <div key={i} className="ai-task-card">
                          <div className="ai-task-card-header">
                            <span className="ai-task-type-badge">
                              {task.task_type === 'chain' ? <Link2 size={14} style={{marginRight:3,verticalAlign:'middle'}} /> :
                               task.task_type === 'application' ? <Smartphone size={14} style={{marginRight:3,verticalAlign:'middle'}} /> :
                               task.task_type === 'script' ? <FileCode size={14} style={{marginRight:3,verticalAlign:'middle'}} /> : <FolderOpen size={14} style={{marginRight:3,verticalAlign:'middle'}} />}
                              {task.task_type === 'chain' ? '链式任务' : task.task_type}
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
                          {/* Phase 2: 链式任务步骤预览 */}
                          {task.steps && task.steps.length > 0 && (
                            <div className="task-chain-preview">
                              {task.steps
                                .sort((a, b) => a.order - b.order)
                                .map((step, si) => {
                                  const meta = STEP_TYPE_META[step.type] || { icon: <Cpu size={14} />, label: step.type };
                                  let detail = '';
                                  if (step.type === 'open_app') detail = step.app_path || '';
                                  else if (step.type === 'wait') detail = step.wait_minutes ? `${step.wait_minutes}分钟` : `${step.wait_seconds || 0}秒`;
                                  else if (step.type === 'playback_recording') detail = step.recording_name || '';
                                  else if (step.type === 'execute_script') detail = step.script_type || 'script';
                                  else if (step.type === 'browser_action') detail = step.url || step.tool || '';
                                  return (
                                    <React.Fragment key={si}>
                                      <div className="chain-step-item">
                                        <span className="chain-step-icon">{meta.icon}</span>
                                        <span className="chain-step-label">{meta.label}</span>
                                        {detail && <span className="chain-step-detail">{detail}</span>}
                                      </div>
                                      {si < task.steps!.length - 1 && (
                                        <div className="chain-step-connector">
                                          <ArrowDown size={12} />
                                        </div>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                            </div>
                          )}
                          {/* Phase 2: 脚本预览确认 */}
                          {task.steps?.filter((s: any) => s.type === 'execute_script').map((s: any, si: number) => (
                            <div key={`script-${si}`} className="ai-script-preview">
                              <div className="ai-script-preview-header">
                                <span className="ai-script-type-badge">{s.script_type || 'bash'}</span>
                                <span style={{fontSize: 11, color: 'var(--text-secondary, #9ca3af)'}}>脚本预览</span>
                                <button
                                  className="ai-script-run-btn"
                                  onClick={async () => {
                                    try {
                                      const { invoke } = await import('@tauri-apps/api/core');
                                      const authLevel = await invoke<string>('script_auth_check', { scriptContent: s.script_content });
                                      if (authLevel !== 'none') {
                                        setAuthConfirm({ visible: true, prompt: s.script_content, level: authLevel, confirmCount: 0 });
                                        return;
                                      }
                                      const result = await invoke<string>('execute_script', { scriptContent: s.script_content, scriptType: s.script_type || 'bash' });
                                      setMessages(prev => [...prev, { id: Date.now(), role: 'ai' as const, content: '✅ 脚本执行完成:\n' + result, timestamp: Date.now() }]);
                                    } catch (e) {
                                      setMessages(prev => [...prev, { id: Date.now(), role: 'ai' as const, content: '❌ 脚本执行失败: ' + e, timestamp: Date.now() }]);
                                    }
                                  }}
                                >
                                  ▶ 立即执行
                                </button>
                              </div>
                              <pre className="ai-script-code"><code>{s.script_content}</code></pre>
                            </div>
                          ))}
                          {task.recording_name && !task.steps && (
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
                  {/* 执行完成后的"存为任务"按钮 */}
                  {msg.executedCommand && msg.role === 'ai' && !msg.loading && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          const task: AiTaskResult = {
                            task_name: `执行: ${msg.executedCommand!.substring(0, 30)}...`,
                            task_type: 'script',
                            path: '',
                            schedule_type: 'daily',
                            schedule_time: '09:00',
                            schedule_days: [],
                            enabled: true,
                            confidence: 0.9,
                            steps: [{
                              order: 1,
                              type: 'execute_script',
                              script_content: msg.executedCommand!,
                              script_type: navigator.platform.includes('Mac') ? 'bash' : 'powershell',
                            }],
                          };
                          handleAddTask(task);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 8, fontSize: 12,
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          color: '#fff', border: 'none', cursor: 'pointer',
                          fontWeight: 500, transition: 'all 0.2s',
                        }}
                      >
                        <Calendar size={12} /> 存为定时任务
                      </button>
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
      <div className="ai-input-bar" style={{ display: 'flex', alignItems: 'center' }}>
        <button
          className="ai-btn-image"
          title="发送图片进行分析"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}
          onClick={async () => {
            try {
              const { open } = await import('@tauri-apps/plugin-dialog');
              const selected = await open({
                multiple: false,
                filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }],
              });
              if (selected && typeof selected === 'string') {
                const loadingId = Date.now();
                setMessages(prev => [...prev,
                  { id: loadingId - 1, role: 'user' as const, content: `📷 发送图片: ${selected.split('/').pop()}`, timestamp: Date.now() },
                  { id: loadingId, role: 'ai' as const, content: '🔍 正在分析图片...', timestamp: Date.now() },
                ]);
                const { invoke } = await import('@tauri-apps/api/core');
                const result = await invoke<string>('image_analyze', { imagePath: selected });
                setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, content: result } : m));
              }
            } catch (e) {
              setMessages(prev => [...prev, { id: Date.now(), role: 'ai' as const, content: '❌ 图片分析失败: ' + e, timestamp: Date.now() }]);
            }
          }}
        >
          <ImagePlus size={18} />
        </button>
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


      {/* OpenClaw 授权确认弹窗 */}
      {authConfirm.visible && (
        <div className="rec-save-dialog">
          <div className="rec-save-dialog-inner" style={{maxWidth: 420}}>
            <h4 style={{color: authConfirm.level === 'critical' ? '#ef4444' : '#f59e0b'}}>
              {authConfirm.level === 'critical' ? '🔴 非常敏感操作' : '🟡 敏感操作'}
            </h4>
            <p style={{fontSize: 13, color: 'var(--text-secondary, #6b7280)', margin: '8px 0'}}>
              {authConfirm.prompt}
            </p>
            <p style={{fontSize: 12, color: 'var(--text-secondary, #9ca3af)'}}>
              {authConfirm.level === 'critical'
                ? `需要确认两次 (已确认 ${authConfirm.confirmCount}/2)`
                : '需要确认一次'}
            </p>
            <div className="rec-save-actions">
              <button className="rec-btn rec-btn-cancel" onClick={() => setAuthConfirm({visible: false, prompt: '', level: '', confirmCount: 0})}>
                取消
              </button>
              <button
                className="rec-btn rec-btn-save"
                style={{background: authConfirm.level === 'critical' ? '#ef4444' : '#f59e0b'}}
                onClick={async () => {
                  if (authConfirm.level === 'critical' && authConfirm.confirmCount < 1) {
                    setAuthConfirm(prev => ({...prev, confirmCount: prev.confirmCount + 1}));
                    return;
                  }
                  setAuthConfirm({visible: false, prompt: '', level: '', confirmCount: 0});
                  try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    const result = await invoke<{success: boolean; output: string}>('openclaw_execute_confirmed', { prompt: authConfirm.prompt });
                    setMessages(prev => [...prev, {
                      id: Date.now(), role: 'ai' as const,
                      content: '✅ 已授权执行完成\n\n' + result.output,
                      timestamp: Date.now(),
                    }]);
                  } catch (e) {
                    setMessages(prev => [...prev, {
                      id: Date.now(), role: 'ai' as const,
                      content: '❌ 授权执行失败: ' + e,
                      timestamp: Date.now(),
                    }]);
                  }
                }}
              >
                {authConfirm.level === 'critical' && authConfirm.confirmCount < 1 ? '第一次确认' : '确认执行'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiAssistantPage;

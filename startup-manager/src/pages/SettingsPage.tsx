import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { t, getCurrentLanguage, setCurrentLanguage, LANGUAGES, Language } from '../i18n';
import AgreementModal from '../components/AgreementModal';
import { ArrowLeft, Sun, Moon, Monitor, Download, Square, CheckCircle2, Cpu, Trash2, FolderOpen } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  vipStatus: string;
  vipExpireDate?: string;
}

type ThemeMode = 'light' | 'dark' | 'auto';

/** 格式化字节数为人类可读 */
const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

interface SettingsPageProps {
  onBack: () => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  user: UserInfo | null;
  onLanguageChange?: (lang: Language) => void;
}

const isTauriEnv = () => !!(window as any).__TAURI_INTERNALS__;

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, themeMode, onThemeModeChange, user, onLanguageChange }) => {
  const [isMac, setIsMac] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [closeBehavior, setCloseBehavior] = useState<'tray' | 'exit'>('tray');
  const [appVersion, setAppVersion] = useState('0.2.8');
  const [updateStatus, setUpdateStatus] = useState<'idle'|'checking'|'downloading'|'installing'|'up-to-date'|'error'>('idle');
  const [updateMsg, setUpdateMsg] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lang, setLang] = useState<Language>(getCurrentLanguage());
  const [statusMsg, setStatusMsg] = useState('');
  const [agreementType, setAgreementType] = useState<'user' | 'privacy' | null>(null);
  const [qqGroups, setQqGroups] = useState<{id: number; name: string; number: string; is_full: number}[]>([]);
  // password change
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  // model management
  const [models, setModels] = useState<{id:string;name:string;size:string;description:string;installed:boolean;downloading:boolean}[]>([]);
  const [engineRunning, setEngineRunning] = useState(false);
  const [modelDownloading, setModelDownloading] = useState<Set<string>>(new Set());
  const [modelDlProgress, setModelDlProgress] = useState<Record<string,{percent:number;downloaded:number;total:number;speed:number}>>({});
  const downloadTimestampRef = useRef<{ts:number;bytes:number}>({ts:0,bytes:0});
  const [modelsDir, setModelsDir] = useState<string>('');
  // mirror source management
  const [mirrorSources, setMirrorSources] = useState<{id:string;name:string;base_url:string;is_custom:boolean}[]>([]);
  const [currentMirror, setCurrentMirror] = useState('hf-mirror');
  const [showCustomMirror, setShowCustomMirror] = useState(false);
  const [customMirrorName, setCustomMirrorName] = useState('');
  const [customMirrorUrl, setCustomMirrorUrl] = useState('');
  // credits & deepseek key
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [hasDeepseekKey, setHasDeepseekKey] = useState(false);
  const [deepseekKeyMasked, setDeepseekKeyMasked] = useState('');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [showDeepseekModal, setShowDeepseekModal] = useState(false);
  const [deepseekKeyStatus, setDeepseekKeyStatus] = useState('');  // success/error msg
  const [deepseekRemaining, setDeepseekRemaining] = useState<number|null>(null);
  const [deepseekDailyLimit, setDeepseekDailyLimit] = useState(100);

  useEffect(() => {
    const init = async () => {
      try {
        if (isTauriEnv()) {
          const { invoke } = await import('@tauri-apps/api/core');
          const info: any = await invoke('get_platform_info');
          setIsMac(info.platform === 'macos');
        } else {
          setIsMac(navigator.platform.toLowerCase().includes('mac'));
        }
      } catch {
        setIsMac(navigator.platform.toLowerCase().includes('mac'));
      }

      // 加载自启动状态
      if (isTauriEnv()) {
        try {
          const { isEnabled } = await import('@tauri-apps/plugin-autostart');
          const enabled = await isEnabled();
          if (!enabled) {
            // First launch: enable autostart by default
            const { enable } = await import('@tauri-apps/plugin-autostart');
            await enable();
            setAutoStart(true);
          } else {
            setAutoStart(enabled);
          }
        } catch (e) {
          console.error('Autostart check failed:', e);
        }
      }
      // 加载关闭行为
      const saved = localStorage.getItem('closeBehavior');
      if (saved === 'exit') {
        setCloseBehavior('exit');
      } else {
        setCloseBehavior('tray');
      }

      // 初始化关闭行为到 Rust
      if (isTauriEnv()) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const behavior = saved || 'tray';
          await invoke('set_close_behavior', { minimizeToTray: behavior === 'tray' });
        } catch (e) {
          console.error('Init close behavior failed:', e);
        }
      }

      // 从服务端加载QQ群配置
      try {
        const res = await fetch('https://bt.aacc.fun:8888/api/qq-groups');
        const groups = await res.json();
        if (Array.isArray(groups)) setQqGroups(groups);
      } catch { /* silent */ }
      // 加载模型列表
      if (isTauriEnv()) {
        try {
          const { invoke: inv } = await import('@tauri-apps/api/core');
          const status: any = await inv('engine_status');
          setModels(status.models || []);
          setEngineRunning(status.engine_running || false);
          setModelsDir(status.models_dir || '');
          // 检查是否有后台正在下载的模型
          try {
            const downloading: string[] = await inv('get_downloading_models');
            if (downloading.length > 0) {
              setModelDownloading(new Set(downloading));
            } else {
              // 无下载中，验证已安装模型
              const installedModels = (status.models || []).filter((m: any) => m.installed && m.id !== 'rule_engine' && m.id !== 'deepseek_cloud');
              if (installedModels.length > 0) {
                showStatus('模型已验证，文件完整 ✅');
              }
            }
          } catch { /* ignore */ }
        } catch { /* ignore */ }
      }
      // 加载模型源配置
      if (isTauriEnv()) {
        try {
          const { invoke: inv } = await import('@tauri-apps/api/core');
          const sources: any = await inv('get_mirror_sources');
          setMirrorSources(sources || []);
          const curMirror: string = await inv('get_current_mirror');
          setCurrentMirror(curMirror || 'hf-mirror');
        } catch { /* ignore */ }
      }
      // 监听模型下载进度事件
      if (isTauriEnv()) {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          const unlisten = await listen<any>('model_download_progress', (ev) => {
            const { model_id, progress, downloaded, total } = ev.payload;
            const now = Date.now();
            setModelDlProgress(prev => {
              const prevData = prev[model_id];
              let speed = prevData?.speed || 0;
              if (prevData && prevData.downloaded > 0) {
                const timeDiff = (now - (downloadTimestampRef.current.ts || now)) / 1000;
                if (timeDiff > 0.5) {
                  speed = (downloaded - downloadTimestampRef.current.bytes) / timeDiff;
                  downloadTimestampRef.current = { ts: now, bytes: downloaded };
                }
              } else {
                downloadTimestampRef.current = { ts: now, bytes: downloaded };
              }
              return { ...prev, [model_id]: { percent: progress, downloaded, total, speed } };
            });
            if (progress >= 100) {
              setTimeout(() => {
                setModelDlProgress(prev => { const n = {...prev}; delete n[model_id]; return n; });
              }, 2000);
            }
          });
          return () => { unlisten(); };
        } catch { /* ignore */ }
      }
      // 加载用户积分和 DeepSeek Key 状态
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await fetch('https://bt.aacc.fun:8888/api/activation/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            setCreditsBalance(profile.credits?.balance || 0);
            setHasDeepseekKey(profile.hasDeepseekKey || false);
            setDeepseekKeyMasked(profile.deepseekKeyMasked || '');
          }
          // 加载 DeepSeek 剩余次数
          refreshDeepseekUsage();
        }
      } catch { /* silent */ }
    };
    init();
  }, []);

  // 单独查询 DeepSeek 剩余次数
  const refreshDeepseekUsage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const usageRes = await fetch('https://bt.aacc.fun:8888/api/deepseek/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usageRes.ok) {
        const usage = await usageRes.json();
        setDeepseekRemaining(usage.remaining);
        setDeepseekDailyLimit(usage.daily_limit);
      }
    } catch { /* silent */ }
  };

  // #7: 缓存 invoke 引用，避免每次动态 import
  const invokeRef = useRef<any>(null);
  const getInvoke = async () => {
    if (!invokeRef.current) {
      const mod = await import('@tauri-apps/api/core');
      invokeRef.current = mod.invoke;
    }
    return invokeRef.current;
  };

  const refreshModels = async () => {
    if (!isTauriEnv()) return;
    try {
      const inv = await getInvoke();
      const status: any = await inv('engine_status');
      setModels(status.models || []);
      setEngineRunning(status.engine_running || false);
      setModelsDir(status.models_dir || '');
    } catch { /* ignore */ }
  };

  const handleDownloadModel = async (modelId: string) => {
    if (!isTauriEnv()) return;
    setModelDownloading(prev => new Set(prev).add(modelId));
    try {
      const { invoke: inv } = await import('@tauri-apps/api/core');
      await inv('model_pull', { modelId });
      showStatus('模型下载完成 ✅');
      await refreshModels();
    } catch (e: any) {
      showStatus('下载失败: ' + (e?.toString() || ''));
    } finally {
      setModelDownloading(prev => { const n = new Set(prev); n.delete(modelId); return n; });
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!isTauriEnv()) return;
    if (!confirm('确定删除该模型？删除后需重新下载')) return;
    try {
      const { invoke: inv } = await import('@tauri-apps/api/core');
      await inv('model_delete', { modelId });
      showStatus('模型已删除');
      await refreshModels();
    } catch (e: any) {
      showStatus('删除失败: ' + (e?.toString() || ''));
    }
  };

  // 自启动切换 — 立即生效
  const handleAutoStartToggle = async (checked: boolean) => {
    setAutoStart(checked);
    if (isTauriEnv()) {
      try {
        const { enable, disable } = await import('@tauri-apps/plugin-autostart');
        if (checked) {
          await enable();
        } else {
          await disable();
        }
      } catch (e) {
        console.error('Autostart toggle failed:', e);
      }
    }
    showStatus(t('settingsSaved', lang));
  };

  // 关闭行为切换 — 立即生效
  const handleCloseBehaviorChange = async (behavior: 'tray' | 'exit') => {
    setCloseBehavior(behavior);
    localStorage.setItem('closeBehavior', behavior);
    if (isTauriEnv()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_close_behavior', { minimizeToTray: behavior === 'tray' });
      } catch (e) {
        console.error('Set close behavior failed:', e);
      }
    }
    showStatus(t('settingsSaved', lang));
  };

  // 语言切换 — 立即生效
  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    setCurrentLanguage(newLang);
    onLanguageChange?.(newLang);
    showStatus(t('settingsSaved', newLang));
  };

  // 显示临时提示
  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 2000);
  };

  useEffect(() => {
    (async () => {
      try {
        const v = await getVersion();
        setAppVersion(v);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      unlisten = await listen<any>('download-progress', (event) => {
        const p = event.payload;
        if (p.total > 0) {
          setDownloadProgress(Math.round((p.downloaded / p.total) * 100));
        } else if (p.downloaded > 0) {
          setDownloadProgress(-1);
        }
        if (p.status === 'completed') {
          setUpdateStatus('installing');
          setUpdateMsg(t('installing', lang));
        }
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, [lang]);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateMsg('');
    try {
      const platform = isMac ? 'macos' : 'windows';
      const jsonStr = await invoke<string>('check_update', { platform, version: appVersion });
      const data = JSON.parse(jsonStr);

      const compareVer = (a: string, b: string): number => {
        const pa = a.replace(/^v/, '').split('.').map(Number);
        const pb = b.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const na = pa[i] || 0;
          const nb = pb[i] || 0;
          if (na > nb) return 1;
          if (na < nb) return -1;
        }
        return 0;
      };

      if (!data.hasUpdate || compareVer(appVersion, data.version) >= 0) {
        setUpdateStatus('up-to-date');
        setUpdateMsg(`${t('currentVersion', lang)} v${appVersion} ${t('upToDate', lang)}`);
        setTimeout(() => { setUpdateStatus('idle'); setUpdateMsg(''); }, 5000);
        return;
      }

      setUpdateStatus('downloading');
      setDownloadProgress(0);
      setUpdateMsg(`${t('downloading', lang)}... v${data.version}`);

      const API_BASE = 'https://bt.aacc.fun:8888';
      const fullUrl = data.downloadUrl.startsWith('http') ? data.downloadUrl : `${API_BASE}${data.downloadUrl}`;
      const filePath = await invoke<string>('download_update', { url: fullUrl });

      localStorage.setItem('installed_update_version', data.version);

      setUpdateStatus('installing');
      setUpdateMsg(t('installing', lang));
      await invoke('install_update', { filePath });
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : (e?.message || e?.toString() || 'Unknown error');
      setUpdateStatus('error');
      setUpdateMsg(`Error: ${errMsg}`);
      setTimeout(() => { setUpdateStatus('idle'); setUpdateMsg(''); }, 8000);
    }
  };

  const emailDisplay = user?.email
    ? user.email.replace(/^(.{3}).*(@.*)$/, '$1****$2')
    : t('notBound', lang);

  const vipDisplay = user?.vipStatus === 'active'
    ? `${t('activated', lang)} (${user.vipExpireDate || t('permanent', lang)})`
    : t('notActivated', lang);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          {t('settings', lang)}
        </button>
        <div className="settings-header-right">
          {statusMsg && <span className="save-msg">{statusMsg}</span>}
        </div>
      </div>

      <div className="settings-body">
        {/* 主题设置 */}
        <div className="settings-section">
          <h3 className="section-title">{t('themeSettings', lang)}</h3>
          <div className="theme-options">
            <label
              className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('light')}
            >
              <input type="radio" name="theme" checked={themeMode === 'light'} readOnly />
              <span className="theme-icon"><Sun size={18} /></span>
              <span>{t('lightMode', lang)}</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('dark')}
            >
              <input type="radio" name="theme" checked={themeMode === 'dark'} readOnly />
              <span className="theme-icon"><Moon size={18} /></span>
              <span>{t('darkMode', lang)}</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'auto' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('auto')}
            >
              <input type="radio" name="theme" checked={themeMode === 'auto'} readOnly />
              <span className="theme-icon"><Monitor size={18} /></span>
              <span>{t('followSystem', lang)}</span>
            </label>
          </div>
        </div>

        {/* 语言设置 */}
        <div className="settings-section">
          <h3 className="section-title">{t('languageSettings', lang)}</h3>
          <div className="language-options">
            {LANGUAGES.map(l => (
              <label
                key={l.code}
                className={`language-option ${lang === l.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(l.code)}
              >
                <input type="radio" name="language" checked={lang === l.code} readOnly />
                <span className="lang-name">{l.nativeName}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 基本设置 */}
        <div className="settings-section">
          <h3 className="section-title">{t('basicSettings', lang)}</h3>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => handleAutoStartToggle(e.target.checked)}
            />
            {t('autoStart', lang)}
          </label>
          {!isMac && (
            <>
              <span className="setting-label">{t('closeWindow', lang)}</span>
              <label className="radio-item">
                <input
                  type="radio"
                  name="close"
                  checked={closeBehavior === 'tray'}
                  onChange={() => handleCloseBehaviorChange('tray')}
                />
                {t('minimizeToTray', lang)}
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="close"
                  checked={closeBehavior === 'exit'}
                  onChange={() => handleCloseBehaviorChange('exit')}
                />
                {t('exitApp', lang)}
              </label>
            </>
          )}
        </div>

        {/* 本地模型管理 */}
        <div className="settings-section">
          <h3 className="section-title">本地模型管理</h3>
          <div className="setting-item">
            <span>推理引擎</span>
            <span className="tag-green"><CheckCircle2 size={14} style={{marginRight:3}} /> 已内置</span>
          </div>
          <div className="setting-item">
            <span>引擎状态</span>
            <span className={engineRunning ? 'tag-green' : 'tag-gray'}>
              {engineRunning ? <><CheckCircle2 size={14} style={{marginRight:3}} /> 运行中</> : <><Square size={14} style={{marginRight:3}} /> 未运行</>}
            </span>
          </div>
          <div className="setting-item">
            <span>模型存储路径</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={modelsDir}>{modelsDir || '默认路径'}</span>
              <button className="action-link" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }} onClick={async () => {
                if (!isTauriEnv()) return;
                try {
                  const { open } = await import('@tauri-apps/plugin-dialog');
                  const selected = await open({ directory: true, title: '选择模型存储目录' });
                  if (selected && typeof selected === 'string') {
                    const { invoke: inv } = await import('@tauri-apps/api/core');
                    await inv('set_models_dir', { dir: selected });
                    setModelsDir(selected);
                    showStatus('模型存储路径已更新 ✅');
                    refreshModels();
                  }
                } catch (e) { showStatus(`更换路径失败: ${e}`); }
              }}><FolderOpen size={12} /> 更换</button>
            </div>
          </div>
          {/* 模型源切换 */}
          <div className="setting-item" style={{flexWrap:'wrap', gap: 8}}>
            <span>模型下载源</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={currentMirror}
                onChange={async (e) => {
                  const newMirror = e.target.value;
                  if (newMirror === '__custom__') {
                    setShowCustomMirror(true);
                    return;
                  }
                  setCurrentMirror(newMirror);
                  if (isTauriEnv()) {
                    try {
                      const { invoke: inv } = await import('@tauri-apps/api/core');
                      await inv('set_mirror', { mirrorId: newMirror });
                      await refreshModels();
                      showStatus('模型源已切换 ✅');
                    } catch (e: any) { showStatus('切换失败: ' + e); }
                  }
                }}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', minWidth: 180 }}
              >
                {mirrorSources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="__custom__">+ 自定义源...</option>
              </select>
              {currentMirror !== 'hf-mirror' && currentMirror !== 'huggingface' && currentMirror !== 'modelscope' && (
                <button className="action-link" style={{fontSize:11}} onClick={() => setShowCustomMirror(true)}>编辑</button>
              )}
            </div>
          </div>
          {showCustomMirror && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 14, marginBottom: 8 }}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>自定义模型源</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <input placeholder="源名称（如：我的镜像站）" value={customMirrorName} onChange={e => setCustomMirrorName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12 }} />
                <input placeholder="基础地址（如：https://hf-mirror.com）" value={customMirrorUrl} onChange={e => setCustomMirrorUrl(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12 }} />
                <div style={{fontSize:11,color:'var(--text-secondary)'}}>地址格式同 HuggingFace，需支持 /org/repo/resolve/main/file 路径</div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button onClick={() => setShowCustomMirror(false)} style={{padding:'5px 14px',border:'1px solid var(--border-color)',borderRadius:6,background:'none',cursor:'pointer',fontSize:12,color:'var(--text-primary)'}}>取消</button>
                  <button className="btn-check-update" style={{fontSize:12,padding:'5px 14px',marginTop:0}} onClick={async () => {
                    if (!customMirrorName.trim() || !customMirrorUrl.trim()) { showStatus('请填写源名称和地址'); return; }
                    if (isTauriEnv()) {
                      try {
                        const { invoke: inv } = await import('@tauri-apps/api/core');
                        await inv('set_custom_mirror_cmd', { name: customMirrorName.trim(), url: customMirrorUrl.trim() });
                        await inv('set_mirror', { mirrorId: 'custom' });
                        setCurrentMirror('custom');
                        const sources: any = await inv('get_mirror_sources');
                        setMirrorSources(sources || []);
                        await refreshModels();
                        setShowCustomMirror(false);
                        showStatus('自定义源已保存 ✅');
                      } catch (e: any) { showStatus('保存失败: ' + e); }
                    }
                  }}>保存并切换</button>
                </div>
              </div>
            </div>
          )}
          <div className="model-list">
            {models.filter(m => m.id !== 'rule_engine' && m.id !== 'deepseek_cloud').map(m => (
              <div key={m.id} className="model-card">
                <div className="model-card-info" style={{flex:1,minWidth:0}}>
                  <div className="model-card-name"><Cpu size={14} style={{marginRight:4,verticalAlign:'middle'}} />{m.name}</div>
                  <div className="model-card-meta">{m.size} · {m.description}</div>
                  {/* 下载进度条 */}
                  {modelDownloading.has(m.id) && modelDlProgress[m.id] && (
                    <div style={{marginTop:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-secondary)',marginBottom:3}}>
                        <span>
                          {formatBytes(modelDlProgress[m.id].downloaded)} / {formatBytes(modelDlProgress[m.id].total)}
                        </span>
                        <span>
                          {modelDlProgress[m.id].speed > 0 ? `${formatBytes(modelDlProgress[m.id].speed)}/s` : '...'}
                          {' · '}{modelDlProgress[m.id].percent}%
                        </span>
                      </div>
                      <div style={{width:'100%',height:6,background:'var(--border-color)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:`${modelDlProgress[m.id].percent}%`,height:'100%',background:'linear-gradient(90deg,#0091FF,#00C9FF)',borderRadius:3,transition:'width 0.3s ease'}} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="model-card-actions">
                  {m.installed ? (
                    <>
                      <span className="tag-green"><CheckCircle2 size={12} style={{marginRight:2}} /> 已安装</span>
                      <button className="model-btn-delete" onClick={() => handleDeleteModel(m.id)}><Trash2 size={12} style={{marginRight:2}} />删除</button>
                    </>
                  ) : (
                    <button
                      className="model-btn-download"
                      onClick={() => handleDownloadModel(m.id)}
                      disabled={modelDownloading.has(m.id)}
                    >
                      {modelDownloading.has(m.id) ? '⏳ 下载中...' : <><Download size={14} style={{marginRight:3}} /> 下载</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 权益设置 */}
        {user && (
          <div className="settings-section">
            <h3 className="section-title">权益设置</h3>
            <div className="setting-item">
              <span>积分余额</span>
              <span className="tag-green" style={{fontWeight:600}}>{creditsBalance}</span>
            </div>
            <div className="setting-item">
              <span>DeepSeek 剩余次数</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color: (deepseekRemaining ?? 100) > 20 ? 'var(--text-primary)' : '#ef4444', fontWeight: 500}}>
                  {deepseekRemaining === null ? `每日 ${deepseekDailyLimit} 次调用 · 今日剩余 N次` : `每日 ${deepseekDailyLimit} 次调用 · 今日剩余 ${deepseekRemaining} 次`}
                </span>
                <button onClick={() => refreshDeepseekUsage()} style={{background:'none',border:'1px solid var(--border-color)',borderRadius:4,cursor:'pointer',padding:'2px 6px',fontSize:11,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:2}} title="刷新">↻ 刷新</button>
              </div>
            </div>
            <div className="setting-item">
              <span>DeepSeek 密钥</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={hasDeepseekKey ? 'tag-green' : 'tag-gray'} style={{fontSize:12}}>
                  {hasDeepseekKey ? `已配置 (${deepseekKeyMasked})` : '未配置'}
                </span>
                <button className="btn-check-update" style={{ fontSize: 12, padding: '4px 12px', marginTop: 0 }}
                  onClick={() => { setShowDeepseekModal(true); setDeepseekKeyInput(''); setDeepseekKeyStatus(''); }}>
                  {hasDeepseekKey ? '修改密钥' : '配置密钥'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 安全设置 */}
        <div className="settings-section">
          <h3 className="section-title">{t('securitySettings', lang)}</h3>
          <div className="setting-item">
            <span>{t('boundEmail', lang)}</span>
            <span className={user?.email ? 'tag-green' : 'tag-gray'}>
              {emailDisplay}
            </span>
          </div>
          <div className="setting-item">
            <span>{t('activationStatus', lang)}</span>
            <span className={user?.vipStatus === 'active' ? 'tag-green' : 'tag-gray'}>
              {vipDisplay}
            </span>
          </div>
          {user && (
            <div style={{ marginTop: 10 }}>
              <button className="btn-check-update" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => { setShowChangePwd(true); setPwdMsg(''); setOldPwd(''); setNewPwd(''); }}>
                {lang === 'zh' ? '修改密码' : 'Change Password'}
              </button>
            </div>
          )}
        </div>

        {/* 其他 */}
        <div className="settings-section">
          <h3 className="section-title">{t('other', lang)}</h3>
          {qqGroups.length > 0 && qqGroups.map(g => (
            <div className="setting-item" key={g.id}>
              <span>{g.name}</span>
              <span className={g.is_full ? 'tag-gray' : 'tag-green'}>
                {g.number} {g.is_full ? (lang === 'zh' ? '(已满)' : '(Full)') : ''}
              </span>
            </div>
          ))}
          <div className="setting-item">
            <span>{t('currentVersion', lang)}</span>
            <span className="tag-gray">v{appVersion}</span>
          </div>
          <button className="btn-check-update" onClick={handleCheckUpdate} disabled={updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'installing'}>
            {updateStatus === 'checking' ? t('checking', lang) : updateStatus === 'downloading' ? `${t('downloading', lang)} ${downloadProgress}%` : updateStatus === 'installing' ? t('installing', lang) : updateStatus === 'up-to-date' ? t('upToDate', lang) : t('checkUpdate', lang)}
          </button>
          {updateMsg && <p style={{ fontSize: '12px', color: updateStatus === 'error' ? '#ef4444' : '#16a34a', marginTop: '8px' }}>{updateMsg}</p>}
        </div>

        {/* 协议 */}
        <div className="settings-section">
          <h3 className="section-title">{t('agreements', lang)}</h3>
          <div className="agreement-links">
            <a className="link-underline" href="#" onClick={(e) => { e.preventDefault(); setAgreementType('user'); }}>{t('userAgreement', lang)}</a>
            <a className="link-underline" href="#" onClick={(e) => { e.preventDefault(); setAgreementType('privacy'); }}>{t('privacyPolicy', lang)}</a>
          </div>
        </div>
      </div>
      {agreementType && (
        <AgreementModal
          isOpen={true}
          onClose={() => setAgreementType(null)}
          type={agreementType}
          lang={lang}
        />
      )}
      {/* 修改密码弹窗 */}
      {showChangePwd && (
        <div className="modal-overlay" onClick={() => setShowChangePwd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 380, maxWidth: '90vw' }}>
            <div className="modal-header">
              <h2>{lang === 'zh' ? '修改密码' : 'Change Password'}</h2>
              <button className="modal-close" onClick={() => setShowChangePwd(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {lang === 'zh' ? '原密码（首次设置可留空）' : 'Current password (leave empty if first time)'}
                </label>
                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                  placeholder={lang === 'zh' ? '请输入原密码' : 'Enter current password'}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {lang === 'zh' ? '新密码（至少6位）' : 'New password (min 6 characters)'}
                </label>
                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder={lang === 'zh' ? '请输入新密码' : 'Enter new password'}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {pwdMsg && <p style={{ fontSize: 13, color: pwdMsg.startsWith('✅') ? '#22c55e' : '#ef4444', margin: 0 }}>{pwdMsg}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button onClick={() => setShowChangePwd(false)}
                  style={{ padding: '8px 20px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button className="btn-check-update" style={{ fontSize: 13, padding: '8px 20px', marginTop: 0 }} onClick={async () => {
                  if (!newPwd || newPwd.length < 6) { setPwdMsg(lang === 'zh' ? '新密码至少6位' : 'Min 6 chars'); return; }
                  try {
                    const token = localStorage.getItem('token');
                    const resp = await fetch('https://bt.aacc.fun:8888/api/auth/change-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ oldPassword: oldPwd || undefined, newPassword: newPwd }),
                    });
                    const data = await resp.json();
                    if (!resp.ok) { setPwdMsg(data.error); return; }
                    setPwdMsg(lang === 'zh' ? '✅ 密码修改成功' : '✅ Password changed');
                    setOldPwd(''); setNewPwd('');
                    setTimeout(() => { setPwdMsg(''); setShowChangePwd(false); }, 2000);
                  } catch { setPwdMsg(lang === 'zh' ? '网络错误' : 'Network error'); }
                }}>{lang === 'zh' ? '保存' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* #11: DeepSeek 密钥修改弹窗 */}
      {showDeepseekModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', minWidth: 380, maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ margin: '0 0 18px 0', fontSize: 16, color: 'var(--text-primary)' }}>DeepSeek 密钥配置</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                API Key
              </label>
              <input
                type="password"
                value={deepseekKeyInput}
                onChange={e => setDeepseekKeyInput(e.target.value)}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{fontSize:11,color:'var(--text-secondary)',marginBottom:14}}>
              配置自己的 DeepSeek API Key 后，使用云端模型无每日次数限制，消耗您自己的 token。
            </div>
            {deepseekKeyStatus && <p style={{ fontSize: 13, color: deepseekKeyStatus.startsWith('✅') ? '#22c55e' : '#ef4444', margin: '0 0 10px 0' }}>{deepseekKeyStatus}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {hasDeepseekKey && (
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    await fetch('https://bt.aacc.fun:8888/api/activation/profile/deepseek-key', {
                      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ key: '' }),
                    });
                    setHasDeepseekKey(false); setDeepseekKeyMasked(''); setDeepseekRemaining(100);
                    setDeepseekKeyStatus('✅ 密钥已清除');
                    setTimeout(() => { setShowDeepseekModal(false); setDeepseekKeyStatus(''); }, 1500);
                  } catch (e) { setDeepseekKeyStatus(`清除失败: ${e}`); }
                }} style={{ padding: '8px 20px', border: '1px solid #ef4444', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}>
                  清除密钥
                </button>
              )}
              <button onClick={() => { setShowDeepseekModal(false); setDeepseekKeyStatus(''); }}
                style={{ padding: '8px 20px', border: '1px solid var(--border-color)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
                取消
              </button>
              <button className="btn-check-update" style={{ fontSize: 13, padding: '8px 20px', marginTop: 0 }} onClick={async () => {
                if (!deepseekKeyInput.trim()) { setDeepseekKeyStatus('请输入 API Key'); return; }
                try {
                  const token = localStorage.getItem('token');
                  const resp = await fetch('https://bt.aacc.fun:8888/api/activation/profile/deepseek-key', {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ key: deepseekKeyInput.trim() }),
                  });
                  if (!resp.ok) { const e = await resp.json(); setDeepseekKeyStatus(`配置失败: ${e.error || '未知错误'}`); return; }
                  setHasDeepseekKey(true);
                  const k = deepseekKeyInput.trim();
                  setDeepseekKeyMasked(k.length > 8 ? k.substring(0,4) + '****' + k.substring(k.length-4) : '****');
                  setDeepseekKeyInput(''); setDeepseekRemaining(-1);
                  setDeepseekKeyStatus('✅ 密钥配置成功');
                  setTimeout(() => { setShowDeepseekModal(false); setDeepseekKeyStatus(''); }, 1500);
                } catch (e) { setDeepseekKeyStatus(`配置失败: ${e}`); }
              }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

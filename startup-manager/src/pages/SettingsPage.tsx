import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { t, getCurrentLanguage, setCurrentLanguage, LANGUAGES, Language } from '../i18n';
import AgreementModal from '../components/AgreementModal';
import { ArrowLeft, Sun, Moon, Monitor, Brain, Download, Square, CheckCircle2, Cpu, Trash2, FolderOpen, Key, Coins } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  vipStatus: string;
  vipExpireDate?: string;
}

type ThemeMode = 'light' | 'dark' | 'auto';

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
  const [modelDownloading, setModelDownloading] = useState<string|null>(null);
  const [modelsDir, setModelsDir] = useState<string>('');
  // credits & deepseek key
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [hasDeepseekKey, setHasDeepseekKey] = useState(false);
  const [deepseekKeyMasked, setDeepseekKeyMasked] = useState('');
  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

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
        } catch { /* ignore */ }
      }
      // 加载用户积分和 DeepSeek Key 状态
      try {
        const token = localStorage.getItem('auth_token');
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
        }
      } catch { /* silent */ }
    };
    init();
  }, []);

  const refreshModels = async () => {
    if (!isTauriEnv()) return;
    try {
      const { invoke: inv } = await import('@tauri-apps/api/core');
      const status: any = await inv('engine_status');
      setModels(status.models || []);
      setEngineRunning(status.engine_running || false);
      setModelsDir(status.models_dir || '');
    } catch { /* ignore */ }
  };

  const handleDownloadModel = async (modelId: string) => {
    if (!isTauriEnv()) return;
    setModelDownloading(modelId);
    try {
      const { invoke: inv } = await import('@tauri-apps/api/core');
      await inv('model_pull', { modelId });
      showStatus('模型下载完成 ✅');
      await refreshModels();
    } catch (e: any) {
      showStatus('下载失败: ' + (e?.toString() || ''));
    } finally {
      setModelDownloading(null);
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
          <h3 className="section-title"><Brain size={18} style={{marginRight:6,verticalAlign:'middle'}} /> 本地模型管理</h3>
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
          <div className="model-list">
            {models.filter(m => m.id !== 'rule_engine' && m.id !== 'deepseek_cloud').map(m => (
              <div key={m.id} className="model-card">
                <div className="model-card-info">
                  <div className="model-card-name"><Cpu size={14} style={{marginRight:4,verticalAlign:'middle'}} />{m.name}</div>
                  <div className="model-card-meta">{m.size} · {m.description}</div>
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
                      disabled={modelDownloading !== null}
                    >
                      {modelDownloading === m.id ? '下载中...' : <><Download size={14} style={{marginRight:3}} /> 下载</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 积分 & DeepSeek Key */}
        {user && (
          <div className="settings-section">
            <h3 className="section-title"><Coins size={18} style={{marginRight:6,verticalAlign:'middle'}} /> 积分 & DeepSeek</h3>
            <div className="setting-item">
              <span>积分余额</span>
              <span className="tag-green" style={{fontWeight:600}}>{creditsBalance}</span>
            </div>
            <div className="setting-item">
              <span><Key size={14} style={{marginRight:4,verticalAlign:'middle'}} /> DeepSeek 密钥</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {hasDeepseekKey && !showKeyInput && (
                  <>
                    <span className="tag-green" style={{fontSize:12}}>{deepseekKeyMasked}</span>
                    <button className="action-link" style={{fontSize:12}} onClick={() => {
                      setShowKeyInput(true); setDeepseekKeyInput('');
                    }}>更换</button>
                    <button className="action-link" style={{fontSize:12,color:'var(--danger)'}} onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        await fetch('https://bt.aacc.fun:8888/api/activation/profile/deepseek-key', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ key: '' }),
                        });
                        setHasDeepseekKey(false); setDeepseekKeyMasked('');
                        showStatus('DeepSeek 密钥已清除 ✅');
                      } catch (e) { showStatus(`清除失败: ${e}`); }
                    }}>清除</button>
                  </>
                )}
                {(!hasDeepseekKey || showKeyInput) && (
                  <>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={deepseekKeyInput}
                      onChange={e => setDeepseekKeyInput(e.target.value)}
                      style={{ width: 200, fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
                    />
                    <button className="action-link" style={{fontSize:12}} onClick={async () => {
                      if (!deepseekKeyInput.trim()) return;
                      try {
                        const token = localStorage.getItem('auth_token');
                        await fetch('https://bt.aacc.fun:8888/api/activation/profile/deepseek-key', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ key: deepseekKeyInput.trim() }),
                        });
                        setHasDeepseekKey(true);
                        const k = deepseekKeyInput.trim();
                        setDeepseekKeyMasked(k.length > 8 ? k.substring(0,4) + '****' + k.substring(k.length-4) : '****');
                        setDeepseekKeyInput(''); setShowKeyInput(false);
                        showStatus('DeepSeek 密钥已保存 ✅');
                      } catch (e) { showStatus(`保存失败: ${e}`); }
                    }}>保存</button>
                    {showKeyInput && <button className="action-link" style={{fontSize:12}} onClick={() => setShowKeyInput(false)}>取消</button>}
                  </>
                )}
              </div>
            </div>
            <div style={{fontSize:11,color:'var(--text-secondary)',padding:'4px 16px'}}>
              配置自己的 DeepSeek API Key 后，使用云端模型无每日次数限制，消耗您自己的 token。
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
                    const token = localStorage.getItem('auth_token');
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
    </div>
  );
};

export default SettingsPage;

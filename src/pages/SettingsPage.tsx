import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';
import { t, getCurrentLanguage, setCurrentLanguage, LANGUAGES, Language } from '../i18n';

interface UserInfo {
  id: string;
  phone: string;
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
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [appVersion, setAppVersion] = useState('0.2.7');
  const [updateStatus, setUpdateStatus] = useState<'idle'|'checking'|'downloading'|'installing'|'up-to-date'|'error'>('idle');
  const [updateMsg, setUpdateMsg] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lang, setLang] = useState<Language>(getCurrentLanguage());

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

      if (isTauriEnv()) {
        try {
          const { isEnabled } = await import('@tauri-apps/plugin-autostart');
          const enabled = await isEnabled();
          setAutoStart(enabled);
        } catch (e) {
          console.error('Autostart check failed:', e);
        }
      }

      const saved = localStorage.getItem('closeBehavior');
      if (saved === 'exit') {
        setCloseBehavior('exit');
      } else {
        setCloseBehavior('tray');
      }

      if (isTauriEnv()) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const behavior = saved || 'tray';
          await invoke('set_close_behavior', { minimizeToTray: behavior === 'tray' });
        } catch (e) {
          console.error('Init close behavior failed:', e);
        }
      }
    };
    init();
  }, []);

  const handleAutoStartToggle = (checked: boolean) => {
    setAutoStart(checked);
    setHasChanges(true);
  };

  const handleCloseBehaviorChange = (behavior: 'tray' | 'exit') => {
    setCloseBehavior(behavior);
    setHasChanges(true);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    setCurrentLanguage(newLang);
    onLanguageChange?.(newLang);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (isTauriEnv()) {
      try {
        const { enable, disable } = await import('@tauri-apps/plugin-autostart');
        if (autoStart) {
          await enable();
        } else {
          await disable();
        }
      } catch (e) {
        console.error('Autostart toggle failed:', e);
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_close_behavior', { minimizeToTray: closeBehavior === 'tray' });
      } catch (e) {
        console.error('Set close behavior failed:', e);
      }
    }

    localStorage.setItem('closeBehavior', closeBehavior);
    setHasChanges(false);
    setSaveMsg(t('settingsSaved', lang));
    setTimeout(() => setSaveMsg(''), 2000);
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

      const API_BASE = 'http://aacc.fun:3001';
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

  const phoneDisplay = user?.phone
    ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    : t('notBound', lang);

  const vipDisplay = user?.vipStatus === 'active'
    ? `${t('activated', lang)} (${user.vipExpireDate || t('permanent', lang)})`
    : t('notActivated', lang);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('settings', lang)}
        </button>
        <div className="settings-header-right">
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
          <button
            className={`btn-save ${hasChanges ? 'active' : ''}`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            {t('saveSettings', lang)}
          </button>
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
              <span className="theme-icon">☀️</span>
              <span>{t('lightMode', lang)}</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('dark')}
            >
              <input type="radio" name="theme" checked={themeMode === 'dark'} readOnly />
              <span className="theme-icon">🌙</span>
              <span>{t('darkMode', lang)}</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'auto' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('auto')}
            >
              <input type="radio" name="theme" checked={themeMode === 'auto'} readOnly />
              <span className="theme-icon">💻</span>
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

        {/* 安全设置 */}
        <div className="settings-section">
          <h3 className="section-title">{t('securitySettings', lang)}</h3>
          <div className="setting-item">
            <span>{t('boundPhone', lang)}</span>
            <span className={user?.phone ? 'tag-green' : 'tag-gray'}>
              {phoneDisplay}
            </span>
          </div>
          <div className="setting-item">
            <span>{t('activationStatus', lang)}</span>
            <span className={user?.vipStatus === 'active' ? 'tag-green' : 'tag-gray'}>
              {vipDisplay}
            </span>
          </div>
        </div>

        {/* 其他 */}
        <div className="settings-section">
          <h3 className="section-title">{t('other', lang)}</h3>
          <div className="setting-item">
            <span>{t('qqGroup', lang)}</span>
            <span className="tag-gray">123456789</span>
          </div>
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
            <a className="link-underline" href="#">{t('userAgreement', lang)}</a>
            <a className="link-underline" href="#">{t('privacyPolicy', lang)}</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

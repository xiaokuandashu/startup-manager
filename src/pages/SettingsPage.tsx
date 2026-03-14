import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';

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
}

const isTauriEnv = () => !!(window as any).__TAURI_INTERNALS__;

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, themeMode, onThemeModeChange, user }) => {
  const [isMac, setIsMac] = useState(false);
  const [autoStart, setAutoStart] = useState(true); // 默认开启
  const [closeBehavior, setCloseBehavior] = useState<'tray' | 'exit'>('tray'); // 默认最小化到托盘
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [appVersion, setAppVersion] = useState('0.2.7');
  const [updateStatus, setUpdateStatus] = useState<'idle'|'checking'|'downloading'|'installing'|'up-to-date'|'error'>('idle');
  const [updateMsg, setUpdateMsg] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      // 检测平台
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
          setAutoStart(enabled);
        } catch (e) {
          console.error('Autostart check failed:', e);
        }
      }

      // 加载关闭行为
      const saved = localStorage.getItem('closeBehavior');
      if (saved === 'exit') {
        setCloseBehavior('exit');
      } else {
        setCloseBehavior('tray'); // 默认最小化到托盘
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
    };
    init();
  }, []);

  // 自启动切换
  const handleAutoStartToggle = (checked: boolean) => {
    setAutoStart(checked);
    setHasChanges(true);
  };

  // 关闭行为切换
  const handleCloseBehaviorChange = (behavior: 'tray' | 'exit') => {
    setCloseBehavior(behavior);
    setHasChanges(true);
  };

  // 保存设置
  const handleSave = async () => {
    // 保存自启动
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

      // 保存关闭行为
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('set_close_behavior', { minimizeToTray: closeBehavior === 'tray' });
      } catch (e) {
        console.error('Set close behavior failed:', e);
      }
    }

    localStorage.setItem('closeBehavior', closeBehavior);
    setHasChanges(false);
    setSaveMsg('✅ 设置已保存');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  // 加载动态版本号
  useEffect(() => {
    (async () => {
      try {
        const v = await getVersion();
        setAppVersion(v);
      } catch {}
    })();
  }, []);

  // 监听下载进度
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      unlisten = await listen<any>('download-progress', (event) => {
        const p = event.payload;
        if (p.total > 0) {
          setDownloadProgress(Math.round((p.downloaded / p.total) * 100));
        } else if (p.downloaded > 0) {
          setDownloadProgress(-1); // 未知总大小
        }
        if (p.status === 'completed') {
          setUpdateStatus('installing');
          setUpdateMsg('下载完成，正在安装...');
        }
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // 检查更新
  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateMsg('');
    try {
      const platform = isMac ? 'macos' : 'windows';
      // 使用 Rust 命令检查更新（绕过 Mac WebView HTTP 限制）
      const jsonStr = await invoke<string>('check_update', { platform, version: appVersion });
      const data = JSON.parse(jsonStr);

      // 比较版本号
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

      // 当前版本 >= 服务端版本，提示已是最新
      if (!data.hasUpdate || compareVer(appVersion, data.version) >= 0) {
        setUpdateStatus('up-to-date');
        setUpdateMsg(`当前版本 v${appVersion} 已是最新版本，暂无更新`);
        setTimeout(() => { setUpdateStatus('idle'); setUpdateMsg(''); }, 5000);
        return;
      }

      // 有更新，开始下载
      setUpdateStatus('downloading');
      setDownloadProgress(0);
      setUpdateMsg(`发现新版本 v${data.version}（当前 v${appVersion}），正在下载...`);

      const API_BASE = 'http://aacc.fun:3001';
      const fullUrl = data.downloadUrl.startsWith('http') ? data.downloadUrl : `${API_BASE}${data.downloadUrl}`;
      const filePath = await invoke<string>('download_update', { url: fullUrl });

      // 记录已安装版本
      localStorage.setItem('installed_update_version', data.version);

      // 自动安装
      setUpdateStatus('installing');
      setUpdateMsg('安装中，应用即将重启...');
      await invoke('install_update', { filePath });
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : (e?.message || e?.toString() || '未知错误');
      setUpdateStatus('error');
      setUpdateMsg(`更新失败: ${errMsg}`);
      setTimeout(() => { setUpdateStatus('idle'); setUpdateMsg(''); }, 8000);
    }
  };

  // 绑定手机号显示
  const phoneDisplay = user?.phone
    ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    : '未绑定';

  // 激活码状态
  const vipDisplay = user?.vipStatus === 'active'
    ? `已激活 (${user.vipExpireDate || '永久'})`
    : '未激活';

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          设置
        </button>
        <div className="settings-header-right">
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
          <button
            className={`btn-save ${hasChanges ? 'active' : ''}`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            保存设置
          </button>
        </div>
      </div>

      <div className="settings-body">
        {/* 主题设置 */}
        <div className="settings-section">
          <h3 className="section-title">主题设置</h3>
          <div className="theme-options">
            <label
              className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('light')}
            >
              <input type="radio" name="theme" checked={themeMode === 'light'} readOnly />
              <span className="theme-icon">☀️</span>
              <span>亮色模式</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('dark')}
            >
              <input type="radio" name="theme" checked={themeMode === 'dark'} readOnly />
              <span className="theme-icon">🌙</span>
              <span>暗夜模式</span>
            </label>
            <label
              className={`theme-option ${themeMode === 'auto' ? 'active' : ''}`}
              onClick={() => onThemeModeChange('auto')}
            >
              <input type="radio" name="theme" checked={themeMode === 'auto'} readOnly />
              <span className="theme-icon">💻</span>
              <span>跟随系统</span>
            </label>
          </div>
        </div>

        {/* 基本设置 */}
        <div className="settings-section">
          <h3 className="section-title">基本设置</h3>
          <label className="checkbox-item">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => handleAutoStartToggle(e.target.checked)}
            />
            开机自启动
          </label>
          {!isMac && (
            <>
              <span className="setting-label">关闭主窗口时</span>
              <label className="radio-item">
                <input
                  type="radio"
                  name="close"
                  checked={closeBehavior === 'tray'}
                  onChange={() => handleCloseBehaviorChange('tray')}
                />
                最小化到托盘
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="close"
                  checked={closeBehavior === 'exit'}
                  onChange={() => handleCloseBehaviorChange('exit')}
                />
                退出程序
              </label>
            </>
          )}
        </div>

        {/* 安全设置 */}
        <div className="settings-section">
          <h3 className="section-title">安全设置</h3>
          <div className="setting-item">
            <span>绑定手机号</span>
            <span className={user?.phone ? 'tag-green' : 'tag-gray'}>
              {phoneDisplay}
            </span>
          </div>
          <div className="setting-item">
            <span>激活码状态</span>
            <span className={user?.vipStatus === 'active' ? 'tag-green' : 'tag-gray'}>
              {vipDisplay}
            </span>
          </div>
        </div>

        {/* 其他 */}
        <div className="settings-section">
          <h3 className="section-title">其他</h3>
          <div className="setting-item">
            <span>QQ交流群</span>
            <span className="tag-gray">123456789</span>
          </div>
          <div className="setting-item">
            <span>当前版本</span>
            <span className="tag-gray">v{appVersion}</span>
          </div>
          <button className="btn-check-update" onClick={handleCheckUpdate} disabled={updateStatus === 'checking' || updateStatus === 'downloading' || updateStatus === 'installing'}>
            {updateStatus === 'checking' ? '检查中...' : updateStatus === 'downloading' ? `下载中 ${downloadProgress}%` : updateStatus === 'installing' ? '安装中...' : updateStatus === 'up-to-date' ? '已是最新版本' : '检查更新'}
          </button>
          {updateMsg && <p style={{ fontSize: '12px', color: updateStatus === 'error' ? '#ef4444' : '#16a34a', marginTop: '8px' }}>{updateMsg}</p>}
        </div>

        {/* 协议 */}
        <div className="settings-section">
          <h3 className="section-title">协议</h3>
          <div className="agreement-links">
            <a className="link-underline" href="#">用户协议</a>
            <a className="link-underline" href="#">隐私政策</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

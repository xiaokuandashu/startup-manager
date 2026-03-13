import React, { useState, useEffect } from 'react';

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
            <span className="tag-gray">v0.1.0</span>
          </div>
          <button className="btn-check-update">检查更新</button>
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

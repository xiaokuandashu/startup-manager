import React, { useState, useEffect } from 'react';

interface UserInfo {
  id: string;
  phone: string;
  vipStatus: string;
  vipExpireDate?: string;
}

interface SettingsPageProps {
  onBack: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  user: UserInfo | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, theme, onThemeChange, user }) => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // 检测平台
    const checkPlatform = async () => {
      try {
        if ((window as any).__TAURI__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const info: any = await invoke('get_platform_info');
          setIsMac(info.platform === 'macos');
        } else {
          setIsMac(navigator.platform.toLowerCase().includes('mac'));
        }
      } catch {
        setIsMac(navigator.platform.toLowerCase().includes('mac'));
      }
    };
    checkPlatform();
  }, []);

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
      </div>

      <div className="settings-body">
        {/* 主题设置 */}
        <div className="settings-section">
          <h3 className="section-title">主题设置</h3>
          <div className="theme-options">
            <label
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
            >
              <input type="radio" name="theme" checked={theme === 'light'} readOnly />
              <span className="theme-icon">☀️</span>
              <span>亮色模式</span>
            </label>
            <label
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
            >
              <input type="radio" name="theme" checked={theme === 'dark'} readOnly />
              <span className="theme-icon">🌙</span>
              <span>暗夜模式</span>
            </label>
          </div>
        </div>

        {/* 基本设置 */}
        <div className="settings-section">
          <h3 className="section-title">基本设置</h3>
          <label className="checkbox-item">
            <input type="checkbox" defaultChecked />
            开机自启动
          </label>
          {!isMac && (
            <>
              <span className="setting-label">关闭主窗口时</span>
              <label className="radio-item">
                <input type="radio" name="close" defaultChecked />
                最小化到托盘
              </label>
              <label className="radio-item">
                <input type="radio" name="close" />
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

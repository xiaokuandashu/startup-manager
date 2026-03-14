import React, { useState, useEffect } from 'react';

interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  downloadUrl: string;
  changelog: string;
  forceUpdate: boolean;
}

const API_BASE = 'http://aacc.fun:3001';
const CURRENT_VERSION = '0.1.0';

const UpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const platform = isMac ? 'macos' : 'windows';
        const resp = await fetch(
          `${API_BASE}/api/updates/check?platform=${platform}&version=${CURRENT_VERSION}`
        );
        const data: UpdateInfo = await resp.json();
        if (data.hasUpdate) {
          setUpdateInfo(data);
        }
      } catch (e) {
        console.log('更新检查失败:', e);
      }
    };

    // 启动后3秒检查更新
    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleDownload = () => {
    setDownloading(true);
    // 拼接完整下载URL
    const fullUrl = updateInfo.downloadUrl.startsWith('http')
      ? updateInfo.downloadUrl
      : `${API_BASE}${updateInfo.downloadUrl}`;
    window.open(fullUrl, '_blank');
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleDismiss = () => {
    if (updateInfo.forceUpdate) return; // 强制更新不能关闭
    setDismissed(true);
  };

  return (
    <div className="update-overlay">
      <div className="update-dialog">
        <div className="update-dialog-header">
          <span className="update-dialog-icon">🚀</span>
          <h3>发现新版本 v{updateInfo.version}</h3>
          {!updateInfo.forceUpdate && (
            <button className="update-close-btn" onClick={handleDismiss}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="update-dialog-body">
          <p className="update-current">当前版本: v{CURRENT_VERSION}</p>
          {updateInfo.changelog && (
            <div className="update-changelog-box">
              <h4>更新内容：</h4>
              <pre>{updateInfo.changelog}</pre>
            </div>
          )}
          {updateInfo.forceUpdate && (
            <p className="update-force-notice">⚠️ 此版本为强制更新，请下载安装后继续使用</p>
          )}
        </div>

        <div className="update-dialog-footer">
          {!updateInfo.forceUpdate && (
            <button className="update-later-btn" onClick={handleDismiss}>稍后更新</button>
          )}
          <button
            className="update-download-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? '正在下载...' : '立即更新'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateChecker;

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getVersion } from '@tauri-apps/api/app';

interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  downloadUrl: string;
  changelog: string;
  forceUpdate: boolean;
}

interface DownloadProgress {
  status: string;
  downloaded: number;
  total: number;
  speed: number;
  path: string;
}

const API_BASE = 'http://aacc.fun:3001';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
};

const UpdateChecker: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState('');
  const [currentVersion, setCurrentVersion] = useState('0.1.0');

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 动态获取应用版本号
        let appVersion = '0.1.0';
        try {
          appVersion = await getVersion();
        } catch {
          console.log('无法获取 Tauri 版本，使用默认版本');
        }
        setCurrentVersion(appVersion);

        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const platform = isMac ? 'macos' : 'windows';
        // 使用 Rust 命令检查更新（绕过 Mac WebView HTTP 限制）
        const jsonStr = await invoke<string>('check_update', { platform, version: appVersion });
        const data: UpdateInfo = JSON.parse(jsonStr);
        if (data.hasUpdate) {
          // 检查是否已经跳过或已安装此版本
          const skippedVersion = localStorage.getItem('skipped_update_version');
          const installedVersion = localStorage.getItem('installed_update_version');
          if (skippedVersion === data.version || installedVersion === data.version) {
            // 已跳过或已安装过，不再提示（除非是强制更新）
            if (!data.forceUpdate) return;
          }
          setUpdateInfo(data);
        }
      } catch (e) {
        console.log('更新检查失败:', e);
      }
    };

    const timer = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 监听下载进度事件
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    (async () => {
      unlisten = await listen<DownloadProgress>('download-progress', (event) => {
        setProgress(event.payload);
        if (event.payload.status === 'completed') {
          setDownloading(false);
        }
      });
    })();
    return () => { if (unlisten) unlisten(); };
  }, []);

  if (!updateInfo || dismissed) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const fullUrl = updateInfo.downloadUrl.startsWith('http')
        ? updateInfo.downloadUrl
        : `${API_BASE}${updateInfo.downloadUrl}`;

      // 调用 Rust 下载命令
      const filePath = await invoke<string>('download_update', { url: fullUrl });

      // 记录已安装版本，避免重复提示
      localStorage.setItem('installed_update_version', updateInfo.version);

      // 下载完成，自动安装
      setInstalling(true);
      await invoke('install_update', { filePath });
    } catch (e: any) {
      setError(typeof e === 'string' ? e : e.toString());
      setDownloading(false);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    if (updateInfo.forceUpdate) return;
    // 记录跳过的版本
    localStorage.setItem('skipped_update_version', updateInfo.version);
    setDismissed(true);
  };

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.downloaded / progress.total) * 100)
    : 0;

  return (
    <div className="update-overlay">
      <div className="update-dialog">
        <div className="update-dialog-header">
          <span className="update-dialog-icon">🚀</span>
          <h3>发现新版本 v{updateInfo.version}</h3>
          {!updateInfo.forceUpdate && !downloading && !installing && (
            <button className="update-close-btn" onClick={handleDismiss}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="update-dialog-body">
          <p className="update-current">当前版本: v{currentVersion}</p>
          {updateInfo.changelog && (
            <div className="update-changelog-box">
              <h4>更新内容：</h4>
              <pre>{updateInfo.changelog}</pre>
            </div>
          )}

          {downloading && progress && (
            <div className="download-progress-box">
              <div className="download-progress-bar">
                <div className="download-progress-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="download-progress-info">
                <span>{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</span>
                <span>{progressPercent}%</span>
                <span>{formatBytes(progress.speed)}/s</span>
              </div>
            </div>
          )}

          {installing && (
            <div className="install-notice">
              <span className="install-spinner"></span>
              正在安装更新，应用即将重启...
            </div>
          )}

          {error && <p className="update-error">{error}</p>}

          {updateInfo.forceUpdate && !downloading && !installing && (
            <p className="update-force-notice">⚠️ 此版本为强制更新，请更新后继续使用</p>
          )}
        </div>

        <div className="update-dialog-footer">
          {!updateInfo.forceUpdate && !downloading && !installing && (
            <button className="update-later-btn" onClick={handleDismiss}>稍后更新</button>
          )}
          <button
            className="update-download-btn"
            onClick={handleDownload}
            disabled={downloading || installing}
          >
            {installing ? '安装中...' : downloading ? '下载中...' : '立即更新'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateChecker;

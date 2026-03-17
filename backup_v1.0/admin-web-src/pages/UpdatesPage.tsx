import { useState, useEffect } from 'react';

interface UpdatesPageProps {
  token: string;
}

interface AppUpdate {
  id: number;
  version: string;
  platform: string;
  download_url: string;
  changelog: string;
  force_update: number;
  created_at: string;
}

export default function UpdatesPage({ token }: UpdatesPageProps) {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // 表单状态
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('windows');
  const [changelog, setChangelog] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [winFile, setWinFile] = useState<File | null>(null);
  const [macFile, setMacFile] = useState<File | null>(null);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/updates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setUpdates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUpdates(); }, []);

  // 自动计算下一个版本号
  const getNextVersion = (): string => {
    if (updates.length === 0) return '0.2.0';
    const versions = updates.map(u => u.version);
    const latest = versions[0]; // 已按 id DESC 排序
    const parts = latest.split('.').map(Number);
    if (parts.length === 3) {
      parts[2] += 1; // patch +1
      return parts.join('.');
    }
    return latest + '.1';
  };

  const openPublish = () => {
    setVersion(getNextVersion());
    setPlatform('windows');
    setChangelog('');
    setForceUpdate(false);
    setWinFile(null);
    setMacFile(null);
    setShowModal(true);
  };

  // 上传文件并获取URL
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '上传失败');
    return data.url;
  };

  // 发布更新
  const handlePublish = async () => {
    if (!version.trim()) return alert('请输入版本号');
    if (!winFile && !macFile) return alert('请至少上传一个安装包');

    setUploading(true);
    try {
      // 上传 Windows 安装包
      if (winFile) {
        setUploadProgress('正在上传 Windows 安装包...');
        const winUrl = await uploadFile(winFile);
        await fetch('/api/admin/updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            version,
            platform: 'windows',
            download_url: winUrl,
            changelog,
            force_update: forceUpdate,
          }),
        });
      }

      // 上传 Mac 安装包
      if (macFile) {
        setUploadProgress('正在上传 Mac 安装包...');
        const macUrl = await uploadFile(macFile);
        await fetch('/api/admin/updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            version,
            platform: 'macos',
            download_url: macUrl,
            changelog,
            force_update: forceUpdate,
          }),
        });
      }

      setUploadProgress('发布成功！');
      setTimeout(() => {
        setShowModal(false);
        setUploadProgress('');
        fetchUpdates();
      }, 1000);
    } catch (e: any) {
      alert('发布失败: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该更新记录？')) return;
    await fetch(`/api/admin/updates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUpdates();
  };

  const platformLabel = (p: string) => p === 'windows' ? '🪟 Windows' : p === 'macos' ? '🍎 macOS' : p;

  return (
    <div className="updates-page">
      <div className="page-toolbar">
        <h2>客户端更新管理</h2>
        <button className="btn-primary" onClick={openPublish}>+ 发布新版本</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : updates.length === 0 ? (
        <div className="empty-state-admin">
          <p>暂无更新记录</p>
          <p style={{ fontSize: 13, color: '#999' }}>点击右上角发布新版本</p>
        </div>
      ) : (
        <div className="updates-list">
          {updates.map(u => (
            <div key={u.id} className="update-card">
              <div className="update-card-header">
                <span className="update-version">v{u.version}</span>
                <span className="update-platform-tag">{platformLabel(u.platform)}</span>
                {u.force_update ? <span className="update-force-tag">强制更新</span> : null}
                <span className="update-time">{u.created_at}</span>
              </div>
              <div className="update-card-body">
                <p className="update-changelog">{u.changelog || '无更新说明'}</p>
                <a className="update-download-link" href={u.download_url} target="_blank" rel="noreferrer">
                  📥 下载安装包
                </a>
              </div>
              <div className="update-card-actions">
                <button className="btn-danger-outline" onClick={() => handleDelete(u.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay-admin" onClick={() => !uploading && setShowModal(false)}>
          <div className="modal-admin modal-wide" onClick={e => e.stopPropagation()}>
            <h3>发布新版本</h3>
            <div className="modal-form-admin">
              <label>版本号（自动递增）</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="例如 0.2.0" />

              <label>更新说明</label>
              <textarea
                value={changelog}
                onChange={e => setChangelog(e.target.value)}
                placeholder="请输入更新内容说明，支持多行"
                rows={4}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e0e0e0', resize: 'vertical' }}
              />

              <label>Windows 安装包 (.exe)</label>
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".exe,.msi"
                  onChange={e => setWinFile(e.target.files?.[0] || null)}
                />
                {winFile && <span className="file-name">✅ {winFile.name} ({(winFile.size / 1024 / 1024).toFixed(1)}MB)</span>}
              </div>

              <label>macOS 安装包 (.dmg)</label>
              <div className="file-upload-area">
                <input
                  type="file"
                  accept=".dmg,.pkg"
                  onChange={e => setMacFile(e.target.files?.[0] || null)}
                />
                {macFile && <span className="file-name">✅ {macFile.name} ({(macFile.size / 1024 / 1024).toFixed(1)}MB)</span>}
              </div>

              <label className="checkbox-label-admin">
                <input type="checkbox" checked={forceUpdate} onChange={e => setForceUpdate(e.target.checked)} />
                强制更新（用户必须更新才能继续使用）
              </label>

              {uploadProgress && (
                <div className="upload-progress">
                  <div className="spinner-sm"></div>
                  <span>{uploadProgress}</span>
                </div>
              )}
            </div>
            <div className="modal-actions-admin">
              <button className="btn-cancel-admin" onClick={() => setShowModal(false)} disabled={uploading}>取消</button>
              <button className="btn-primary" onClick={handlePublish} disabled={uploading}>
                {uploading ? '发布中...' : '发布更新'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';

interface MarketTask {
  id: string; name: string; description: string; category: string;
  tags: string; status: string; safety_level: string;
  download_count: number; rating: number; publisher_email: string;
  auto_result: string; auto_risks: string; reject_reason: string;
  created_at: string;
}

interface MarketStats {
  total: number; approved: number; pending: number;
  rejected: number; totalDownloads: number; totalCredits: number;
}

export default function MarketplaceAdminPage({ token }: { token: string }) {
  const [tasks, setTasks] = useState<MarketTask[]>([]);
  const [allTasks, setAllTasks] = useState<MarketTask[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadStats(); loadPending(); loadAll(); }, []);

  const loadStats = async () => {
    try {
      const r = await fetch('/api/admin/market-stats', { headers });
      setStats(await r.json());
    } catch { /* ignore */ }
  };

  const loadPending = async () => {
    try {
      const r = await fetch('/api/admin/audit/pending', { headers });
      setTasks(await r.json());
    } catch { /* ignore */ }
  };

  const loadAll = async () => {
    try {
      const r = await fetch('/api/marketplace/list?limit=100');
      const data = await r.json();
      setAllTasks(data.tasks || []);
    } catch { /* ignore */ }
  };

  const handleApprove = async (taskId: string) => {
    await fetch('/api/admin/audit/approve', { method: 'POST', headers, body: JSON.stringify({ taskId }) });
    loadPending(); loadStats(); loadAll();
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await fetch('/api/admin/audit/reject', { method: 'POST', headers, body: JSON.stringify({ taskId: rejectId, reason: rejectReason }) });
    setRejectId(null); setRejectReason('');
    loadPending(); loadStats(); loadAll();
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('确定删除此任务？不可恢复')) return;
    await fetch(`/api/admin/audit/task/${taskId}`, { method: 'DELETE', headers });
    loadPending(); loadStats(); loadAll();
  };

  const safetyBadge = (level: string) => {
    const m: Record<string, [string, string]> = { safe: ['🟢', '安全'], review: ['🟡', '待审'], dangerous: ['🔴', '危险'] };
    const [icon, label] = m[level] || ['⚪', level];
    return <span className={`badge badge-${level}`}>{icon} {label}</span>;
  };

  const statusBadge = (s: string) => {
    const m: Record<string, [string, string]> = { approved: ['✅', '已通过'], pending: ['⏳', '待审核'], rejected: ['❌', '已拒绝'] };
    const [icon, label] = m[s] || ['•', s];
    return <span className={`badge badge-${s}`}>{icon} {label}</span>;
  };

  return (
    <div className="admin-page">
      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">总任务数</div></div>
          <div className="stat-card" style={{ borderLeft: '3px solid #22c55e' }}><div className="stat-value">{stats.approved}</div><div className="stat-label">已通过</div></div>
          <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}><div className="stat-value">{stats.pending}</div><div className="stat-label">待审核</div></div>
          <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}><div className="stat-value">{stats.rejected}</div><div className="stat-label">已拒绝</div></div>
          <div className="stat-card"><div className="stat-value">{stats.totalDownloads}</div><div className="stat-label">总下载量</div></div>
          <div className="stat-card"><div className="stat-value">{stats.totalCredits}</div><div className="stat-label">流通积分</div></div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          ⏳ 待审核 {tasks.length > 0 && <span className="tab-badge">{tasks.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>📋 全部任务</button>
      </div>

      {/* Task List */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>任务名称</th><th>分类</th><th>发布者</th><th>安全</th><th>状态</th><th>下载</th><th>评分</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {(tab === 'pending' ? tasks : allTasks).length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              {tab === 'pending' ? '暂无待审核任务 🎉' : '暂无任务'}
            </td></tr>
          ) : (tab === 'pending' ? tasks : allTasks).map(t => (
            <tr key={t.id}>
              <td>
                <div style={{ fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
              </td>
              <td>{t.category}</td>
              <td style={{ fontSize: 12 }}>{t.publisher_email || '—'}</td>
              <td>{safetyBadge(t.safety_level)}</td>
              <td>{statusBadge(t.status)}</td>
              <td>{t.download_count}</td>
              <td>{'★'.repeat(Math.floor(t.rating || 0))}{t.rating ? ` ${t.rating}` : '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {t.status === 'pending' && (
                    <>
                      <button className="btn-sm btn-success" onClick={() => handleApprove(t.id)}>✓ 通过</button>
                      <button className="btn-sm btn-danger" onClick={() => { setRejectId(t.id); setRejectReason(''); }}>✕ 拒绝</button>
                    </>
                  )}
                  <button className="btn-sm btn-ghost" onClick={() => handleDelete(t.id)}>🗑</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Reject Modal */}
      {rejectId && (
        <div className="profile-modal-overlay" onClick={() => setRejectId(null)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>拒绝原因</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="请输入拒绝原因..." rows={3}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 12 }} />
            <div className="modal-actions-admin" style={{ marginTop: 16 }}>
              <button className="btn-cancel-admin" onClick={() => setRejectId(null)}>取消</button>
              <button className="btn-primary" onClick={handleReject} style={{ background: '#ef4444' }}>确认拒绝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

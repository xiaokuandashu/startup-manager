import { useState } from 'react';

export default function CreditsAdminPage({ token }: { token: string }) {
  const [searchEmail, setSearchEmail] = useState('');
  const [userCredits, setUserCredits] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const searchUser = async () => {
    if (!searchEmail.trim()) return;
    setLoading(true); setError('');
    try {
      // 先查找用户ID
      const usersResp = await fetch('/api/admin/users', { headers });
      const users = await usersResp.json();
      const user = (users as any[]).find((u: any) => 
        u.email?.toLowerCase().includes(searchEmail.toLowerCase()) || u.id === searchEmail
      );
      if (!user) { setError('未找到该用户'); setLoading(false); return; }

      // 查询积分
      const creditsResp = await fetch(`/api/credits/balance/${user.id}`, { headers });
      const credits = await creditsResp.json();
      setUserCredits({ ...credits, email: user.email, userId: user.id });

      // 查询明细
      const histResp = await fetch(`/api/credits/history/${user.id}?limit=50`, { headers });
      const histData = await histResp.json();
      setHistory(histData.history || []);
    } catch { setError('查询失败'); }
    setLoading(false);
  };

  const typeLabels: Record<string, string> = {
    publish: '📤 发布奖励', download: '📥 下载消费', vip_bonus: '💎 VIP赠送',
    admin_grant: '🎁 管理员发放', refund: '💰 退款',
  };

  return (
    <div className="admin-page">
      {/* Search */}
      <div className="search-box" style={{ display: 'flex', gap: 8, marginBottom: 24, maxWidth: 500 }}>
        <input className="form-input" value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchUser()}
          placeholder="输入用户邮箱搜索..."
          style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <button className="btn-primary" onClick={searchUser} disabled={loading}>
          {loading ? '搜索中...' : '🔍 搜索'}
        </button>
      </div>
      {error && <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>}

      {/* User Credits Card */}
      {userCredits && (
        <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
              {userCredits.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{userCredits.email}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>ID: {userCredits.userId}</div>
            </div>
          </div>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card" style={{ borderLeft: '3px solid #6366f1' }}>
              <div className="stat-value">{userCredits.balance || 0}</div>
              <div className="stat-label">当前余额</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #22c55e' }}>
              <div className="stat-value">{userCredits.total_earned || 0}</div>
              <div className="stat-label">累计获得</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="stat-value">{userCredits.total_spent || 0}</div>
              <div className="stat-label">累计消费</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ fontSize: 14 }}>{userCredits.expire_date || '永久'}</div>
              <div className="stat-label">过期时间</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <h3 style={{ marginBottom: 12, fontSize: 15 }}>📋 积分明细</h3>
          <table className="admin-table">
            <thead>
              <tr><th>时间</th><th>类型</th><th>变动</th><th>说明</th></tr>
            </thead>
            <tbody>
              {history.map((h: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleString('zh-CN')}</td>
                  <td>{typeLabels[h.type] || h.type}</td>
                  <td style={{ fontWeight: 600, color: h.amount > 0 ? '#22c55e' : '#ef4444' }}>
                    {h.amount > 0 ? '+' : ''}{h.amount}
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{h.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Empty state */}
      {!userCredits && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <div>搜索用户邮箱查看积分信息</div>
        </div>
      )}
    </div>
  );
}

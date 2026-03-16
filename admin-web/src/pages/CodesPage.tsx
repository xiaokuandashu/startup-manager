import { useState, useEffect } from 'react';

interface CodesPageProps {
  token: string;
}

interface ActivationCode {
  id: number;
  code: string;
  plan_duration: string;
  status: string;
  user_email: string | null;
  activated_at: string | null;
  expire_date: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: '待使用',
  activated: '已激活',
  suspended: '已暂停',
  expired: '已过期',
};
const statusColors: Record<string, string> = {
  pending: '#3B82F6',
  activated: '#22C55E',
  suspended: '#F59E0B',
  expired: '#EF4444',
};
const durationLabels: Record<string, string> = {
  '1month': '1个月',
  '3month': '3个月',
  '1year': '1年',
  'permanent': '永久',
};

export default function CodesPage({ token }: CodesPageProps) {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genDuration, setGenDuration] = useState('1month');
  const [genCount, setGenCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState('');
  // search
  const [searchEmail, setSearchEmail] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchDuration, setSearchDuration] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (searchEmail.trim()) p.set('email', searchEmail.trim());
      if (searchCode.trim()) p.set('code', searchCode.trim());
      if (searchDuration) p.set('plan_duration', searchDuration);
      if (searchStatus) p.set('status', searchStatus);
      if (searchStartDate) p.set('start_date', searchStartDate);
      if (searchEndDate) p.set('end_date', searchEndDate);
      const qs = p.toString();
      const resp = await fetch(`/api/admin/codes${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setCodes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleSearch = () => fetchCodes();
  const handleReset = () => {
    setSearchEmail('');
    setSearchCode('');
    setSearchDuration('');
    setSearchStatus('');
    setSearchStartDate('');
    setSearchEndDate('');
    setTimeout(() => fetchCodes(), 0);
  };

  const handleGenerate = async () => {
    try {
      const resp = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_duration: genDuration, count: genCount }),
      });
      const data = await resp.json();
      setGeneratedCodes(data.codes);
      fetchCodes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSuspend = async (id: number) => {
    await fetch(`/api/admin/codes/${id}/suspend`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCodes();
  };

  const handleResume = async (id: number) => {
    await fetch(`/api/admin/codes/${id}/resume`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCodes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该激活码？')) return;
    await fetch(`/api/admin/codes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(code);
    setTimeout(() => setCopySuccess(''), 1500);
  };

  const copyAllGenerated = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    setCopySuccess('all');
    setTimeout(() => setCopySuccess(''), 1500);
  };

  return (
    <div className="codes-page">
      {/* 搜索栏 */}
      <div className="search-bar-admin">
        <input placeholder="用户邮箱" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} />
        <input placeholder="激活码" value={searchCode} onChange={e => setSearchCode(e.target.value)} />
        <select value={searchDuration} onChange={e => setSearchDuration(e.target.value)}>
          <option value="">全部时长</option>
          <option value="1month">1个月</option>
          <option value="3month">3个月</option>
          <option value="1year">1年</option>
          <option value="permanent">永久</option>
        </select>
        <select value={searchStatus} onChange={e => setSearchStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="pending">待使用</option>
          <option value="activated">已激活</option>
          <option value="suspended">已暂停</option>
          <option value="expired">已过期</option>
        </select>
        <input type="date" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} title="开始日期" />
        <input type="date" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} title="结束日期" />
        <button className="btn-primary" onClick={handleSearch}>搜索</button>
        <button className="btn-cancel-admin" onClick={handleReset}>重置</button>
      </div>

      <div className="page-toolbar">
        <h2>激活码列表 ({codes.length})</h2>
        <button className="btn-primary" onClick={() => { setShowGenerate(true); setGeneratedCodes([]); }}>
          + 批量生成
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : codes.length === 0 ? (
        <div className="empty-admin">暂无激活码，点击"批量生成"创建</div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>激活码</th>
                <th>套餐时长</th>
                <th>状态</th>
                <th>绑定邮箱</th>
                <th>激活时间</th>
                <th>到期时间</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => (
                <tr key={code.id}>
                  <td>
                    <div className="code-cell">
                      <code className="code-text">{code.code}</code>
                      <button
                        className="btn-copy-sm"
                        onClick={() => copyCode(code.code)}
                        title="复制"
                      >
                        {copySuccess === code.code ? '✓' : '📋'}
                      </button>
                    </div>
                  </td>
                  <td>{durationLabels[code.plan_duration] || code.plan_duration}</td>
                  <td>
                    <span className="status-badge" style={{ color: statusColors[code.status] || '#999' }}>
                      {statusLabels[code.status] || code.status}
                    </span>
                  </td>
                  <td>{code.user_email || '—'}</td>
                  <td className="date-cell">{code.activated_at?.split('T')[0] || '—'}</td>
                  <td className="date-cell">{code.expire_date || '—'}</td>
                  <td className="date-cell">{code.created_at?.split('T')[0] || '—'}</td>
                  <td>
                    <div className="action-buttons">
                      {code.status === 'pending' && (
                        <button className="btn-action-sm warning" onClick={() => handleSuspend(code.id)}>暂停</button>
                      )}
                      {code.status === 'suspended' && (
                        <button className="btn-action-sm success" onClick={() => handleResume(code.id)}>恢复</button>
                      )}
                      <button className="btn-action-sm danger" onClick={() => handleDelete(code.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showGenerate && (
        <div className="modal-overlay-admin" onClick={() => setShowGenerate(false)}>
          <div className="modal-admin" onClick={e => e.stopPropagation()}>
            <h3>批量生成激活码</h3>
            <div className="modal-form-admin">
              <label>套餐时长</label>
              <select value={genDuration} onChange={e => setGenDuration(e.target.value)}>
                <option value="1month">1个月</option>
                <option value="3month">3个月</option>
                <option value="1year">1年</option>
                <option value="permanent">永久</option>
              </select>

              <label>生成数量</label>
              <input type="number" min={1} max={100} value={genCount} onChange={e => setGenCount(Number(e.target.value))} />
            </div>

            {generatedCodes.length > 0 && (
              <div className="generated-codes">
                <div className="gen-header">
                  <span>已生成 {generatedCodes.length} 个激活码</span>
                  <button className="btn-copy-all" onClick={copyAllGenerated}>
                    {copySuccess === 'all' ? '✓ 已复制' : '📋 复制全部'}
                  </button>
                </div>
                <div className="gen-list">
                  {generatedCodes.map((c, i) => (
                    <div key={i} className="gen-code-item">
                      <code>{c}</code>
                      <button className="btn-copy-sm" onClick={() => copyCode(c)}>
                        {copySuccess === c ? '✓' : '📋'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions-admin">
              <button className="btn-cancel-admin" onClick={() => setShowGenerate(false)}>关闭</button>
              <button className="btn-primary" onClick={handleGenerate}>生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';

interface AgreementsPageProps {
  token: string;
}

interface Agreement {
  id: number;
  type: string;
  title_zh: string;
  title_en: string;
  content_zh: string;
  content_en: string;
  updated_at: string;
}

const typeLabels: Record<string, string> = { user: '用户协议', privacy: '隐私政策' };

export default function AgreementsPage({ token }: AgreementsPageProps) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Agreement | null>(null);
  const [form, setForm] = useState({ title_zh: '', title_en: '', content_zh: '', content_en: '' });

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/agreements', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      setAgreements(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgreements(); }, []);

  const openEdit = (a: Agreement) => {
    setEditItem(a);
    setForm({ title_zh: a.title_zh, title_en: a.title_en, content_zh: a.content_zh, content_en: a.content_en });
  };

  const handleSave = async () => {
    if (!editItem) return;
    await fetch(`/api/admin/agreements/${editItem.type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setEditItem(null);
    fetchAgreements();
  };

  return (
    <div className="codes-page">
      <div className="page-toolbar">
        <h2>协议管理</h2>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : editItem ? (
        <div style={{ background: 'var(--admin-card)', borderRadius: 'var(--admin-radius)', padding: 24, boxShadow: 'var(--admin-shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>编辑：{typeLabels[editItem.type] || editItem.type}</h3>
            <button className="btn-cancel-admin" onClick={() => setEditItem(null)}>← 返回列表</button>
          </div>

          <div className="modal-form-admin">
            <label>中文标题</label>
            <input value={form.title_zh} onChange={e => setForm({ ...form, title_zh: e.target.value })} />
            <label>英文标题</label>
            <input value={form.title_en} onChange={e => setForm({ ...form, title_en: e.target.value })} />
            <label>中文内容</label>
            <textarea rows={12} value={form.content_zh} onChange={e => setForm({ ...form, content_zh: e.target.value })} style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 12, borderRadius: 8, border: '1.5px solid var(--admin-border)', resize: 'vertical', outline: 'none' }} />
            <label>英文内容</label>
            <textarea rows={12} value={form.content_en} onChange={e => setForm({ ...form, content_en: e.target.value })} style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, padding: 12, borderRadius: 8, border: '1.5px solid var(--admin-border)', resize: 'vertical', outline: 'none' }} />
          </div>

          <div className="modal-actions-admin" style={{ marginTop: 16 }}>
            <button className="btn-cancel-admin" onClick={() => setEditItem(null)}>取消</button>
            <button className="btn-primary" onClick={handleSave}>保存修改</button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>中文标题</th>
                <th>英文标题</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map(a => (
                <tr key={a.id}>
                  <td>
                    <span className="status-badge" style={{ color: '#3B82F6', fontWeight: 500 }}>
                      {typeLabels[a.type] || a.type}
                    </span>
                  </td>
                  <td>{a.title_zh}</td>
                  <td>{a.title_en}</td>
                  <td className="date-cell">{a.updated_at || '—'}</td>
                  <td>
                    <button className="btn-action-sm warning" onClick={() => openEdit(a)}>编辑</button>
                  </td>
                </tr>
              ))}
              {agreements.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无协议数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

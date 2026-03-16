import { useState, useEffect } from 'react';

interface QQGroupsPageProps {
  token: string;
}

interface QQGroup {
  id: number;
  name: string;
  number: string;
  is_full: number;
  sort_order: number;
}

export default function QQGroupsPage({ token }: QQGroupsPageProps) {
  const [groups, setGroups] = useState<QQGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<QQGroup | null>(null);
  const [form, setForm] = useState({ name: '', number: '', is_full: false, sort_order: 0 });

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/qq-groups', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      setGroups(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(); }, []);

  const openAdd = () => {
    setEditGroup(null);
    setForm({ name: '', number: '', is_full: false, sort_order: groups.length + 1 });
    setShowModal(true);
  };

  const openEdit = (g: QQGroup) => {
    setEditGroup(g);
    setForm({ name: g.name, number: g.number, is_full: !!g.is_full, sort_order: g.sort_order });
    setShowModal(true);
  };

  const handleSave = async () => {
    const url = editGroup ? `/api/admin/qq-groups/${editGroup.id}` : '/api/admin/qq-groups';
    const method = editGroup ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    fetchGroups();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该QQ群吗？')) return;
    await fetch(`/api/admin/qq-groups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchGroups();
  };

  return (
    <div className="codes-page">
      <div className="page-toolbar">
        <h2>QQ群管理 ({groups.length})</h2>
        <button className="btn-primary" onClick={openAdd}>+ 新增群</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : groups.length === 0 ? (
        <div className="empty-admin">暂无QQ群数据，点击"+ 新增群"添加</div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>群名称</th>
                <th>群号</th>
                <th>是否已满</th>
                <th>排序</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td>{g.id}</td>
                  <td>{g.name}</td>
                  <td>{g.number}</td>
                  <td>
                    <span className="status-badge" style={{ color: g.is_full ? '#EF4444' : '#22C55E' }}>
                      {g.is_full ? '已满' : '可加入'}
                    </span>
                  </td>
                  <td>{g.sort_order}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-action-sm warning" onClick={() => openEdit(g)}>编辑</button>
                      <button className="btn-action-sm danger" onClick={() => handleDelete(g.id)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay-admin" onClick={() => setShowModal(false)}>
          <div className="modal-admin" onClick={e => e.stopPropagation()}>
            <h3>{editGroup ? '编辑QQ群' : '新增QQ群'}</h3>
            <div className="modal-form-admin">
              <label>群名称</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：自启精灵交流1群" />
              <label>群号</label>
              <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="QQ群号" />
              <label className="checkbox-label-admin">
                <input type="checkbox" checked={form.is_full} onChange={e => setForm({ ...form, is_full: e.target.checked })} />
                已满
              </label>
              <label>排序（数字越小越靠前）</label>
              <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="modal-actions-admin">
              <button className="btn-cancel-admin" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

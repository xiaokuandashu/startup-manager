import { useState, useEffect } from 'react';

interface PlansPageProps {
  token: string;
}

interface Plan {
  id: number;
  name: string;
  duration: string;
  original_price: number;
  actual_price: number;
  is_limited: number;
}

const durationLabels: Record<string, string> = {
  '1month': '1个月',
  '3month': '3个月',
  '1year': '1年',
  'permanent': '永久',
};

export default function PlansPage({ token }: PlansPageProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: '', duration: '1month', original_price: 0, actual_price: 0, is_limited: false });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openAdd = () => {
    setEditPlan(null);
    setForm({ name: '', duration: '1month', original_price: 0, actual_price: 0, is_limited: false });
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setForm({
      name: plan.name,
      duration: plan.duration,
      original_price: plan.original_price,
      actual_price: plan.actual_price,
      is_limited: !!plan.is_limited,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const url = editPlan ? `/api/admin/plans/${editPlan.id}` : '/api/admin/plans';
    const method = editPlan ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    fetchPlans();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该套餐？')) return;
    await fetch(`/api/admin/plans/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPlans();
  };

  return (
    <div className="plans-page">
      <div className="page-toolbar">
        <h2>套餐列表</h2>
        <button className="btn-primary" onClick={openAdd}>+ 新增套餐</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : (
        <div className="plans-grid">
          {plans.map(plan => (
            <div key={plan.id} className="plan-card-admin">
              {plan.is_limited ? <span className="plan-badge">限时</span> : null}
              <div className="plan-card-name">{plan.name}</div>
              <div className="plan-card-duration">{durationLabels[plan.duration] || plan.duration}</div>
              <div className="plan-card-prices">
                <span className="plan-actual-price">¥{plan.actual_price}</span>
                {plan.original_price > plan.actual_price && (
                  <span className="plan-original-price">¥{plan.original_price}</span>
                )}
              </div>
              <div className="plan-card-actions">
                <button className="btn-outline" onClick={() => openEdit(plan)}>编辑</button>
                <button className="btn-danger-outline" onClick={() => handleDelete(plan.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay-admin" onClick={() => setShowModal(false)}>
          <div className="modal-admin" onClick={e => e.stopPropagation()}>
            <h3>{editPlan ? '编辑套餐' : '新增套餐'}</h3>
            <div className="modal-form-admin">
              <label>套餐名称</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="套餐名称" />

              <label>时长</label>
              <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>
                <option value="1month">1个月</option>
                <option value="3month">3个月</option>
                <option value="1year">1年</option>
                <option value="permanent">永久</option>
              </select>

              <label>原价</label>
              <input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: Number(e.target.value) })} />

              <label>实际价格</label>
              <input type="number" value={form.actual_price} onChange={e => setForm({ ...form, actual_price: Number(e.target.value) })} />

              <label className="checkbox-label-admin">
                <input type="checkbox" checked={form.is_limited} onChange={e => setForm({ ...form, is_limited: e.target.checked })} />
                限时优惠
              </label>
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

import { useState, useEffect } from 'react';

interface OrdersPageProps {
  token: string;
}

interface Order {
  id: number;
  user_id: string;
  user_email: string;
  plan_name: string;
  amount: number;
  pay_type: string;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  paid: '已支付',
  pending: '待支付',
  refunded: '已退款',
};
const statusColors: Record<string, string> = {
  paid: '#22C55E',
  pending: '#F59E0B',
  refunded: '#EF4444',
};

export default function OrdersPage({ token }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  // search
  const [searchEmail, setSearchEmail] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchPlan, setSearchPlan] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (searchEmail.trim()) p.set('email', searchEmail.trim());
      if (searchOrderId.trim()) p.set('order_id', searchOrderId.trim());
      if (searchPlan.trim()) p.set('plan_name', searchPlan.trim());
      if (searchStartDate) p.set('start_date', searchStartDate);
      if (searchEndDate) p.set('end_date', searchEndDate);
      const qs = p.toString();
      const resp = await fetch(`/api/admin/orders${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const handleSearch = () => fetchOrders();
  const handleReset = () => {
    setSearchEmail('');
    setSearchOrderId('');
    setSearchPlan('');
    setSearchStartDate('');
    setSearchEndDate('');
    setStatusFilter('');
    setTimeout(() => fetchOrders(), 0);
  };

  return (
    <div className="orders-page">
      {/* 搜索栏 */}
      <div className="search-bar-admin">
        <input placeholder="用户邮箱" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} />
        <input placeholder="订单ID" value={searchOrderId} onChange={e => setSearchOrderId(e.target.value)} style={{ width: 80 }} />
        <input placeholder="套餐名称" value={searchPlan} onChange={e => setSearchPlan(e.target.value)} style={{ width: 100 }} />
        <input type="date" value={searchStartDate} onChange={e => setSearchStartDate(e.target.value)} title="开始日期" />
        <input type="date" value={searchEndDate} onChange={e => setSearchEndDate(e.target.value)} title="结束日期" />
        <button className="btn-primary" onClick={handleSearch}>搜索</button>
        <button className="btn-cancel-admin" onClick={handleReset}>重置</button>
      </div>

      <div className="page-toolbar">
        <h2>订单列表 ({orders.length})</h2>
        <div className="filter-tabs">
          <button className={!statusFilter ? 'active' : ''} onClick={() => setStatusFilter('')}>全部</button>
          <button className={statusFilter === 'paid' ? 'active' : ''} onClick={() => setStatusFilter('paid')}>已支付</button>
          <button className={statusFilter === 'pending' ? 'active' : ''} onClick={() => setStatusFilter('pending')}>待支付</button>
          <button className={statusFilter === 'refunded' ? 'active' : ''} onClick={() => setStatusFilter('refunded')}>已退款</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div><span>加载中...</span></div>
      ) : orders.length === 0 ? (
        <div className="empty-admin">暂无订单数据</div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>订单ID</th>
                <th>用户邮箱</th>
                <th>套餐</th>
                <th>金额</th>
                <th>支付方式</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user_email || '—'}</td>
                  <td>{order.plan_name || '—'}</td>
                  <td className="amount-cell">¥{order.amount}</td>
                  <td>{order.pay_type || '—'}</td>
                  <td>
                    <span className="status-badge" style={{ color: statusColors[order.status] || '#999' }}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="date-cell">{order.created_at?.split('T')[0] || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

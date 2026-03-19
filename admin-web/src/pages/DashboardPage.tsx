import { useState, useEffect } from 'react';

interface DashboardPageProps {
  token: string;
}

interface DashboardData {
  totalUsers: number;
  vipUsers: number;
  totalCodes: number;
  activatedCodes: number;
  pendingCodes: number;
  totalRevenue: number;
  registeredNotPaid: number;
  todayActive: number;
}

interface DetailData {
  title: string;
  data: any[];
  total: number;
}

export default function DashboardPage({ token }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterType, setFilterType] = useState<'today' | 'range' | 'year'>('today');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerDetail, setDrawerDetail] = useState<DetailData | null>(null);
  const [activeMetric, setActiveMetric] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/dashboard';
      const params = new URLSearchParams();
      if (filterType === 'year') {
        params.set('year', String(year));
      }
      if (params.toString()) url += '?' + params.toString();

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      setData(json);
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filterType, year]);

  const handleCardClick = async (metricKey: string) => {
    setActiveMetric(metricKey);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerDetail(null);
    try {
      const resp = await fetch(`/api/admin/dashboard/detail/${metricKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      setDrawerDetail(json);
    } catch (e) {
      console.error('Detail fetch error', e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const cards = data ? [
    { label: '总用户数', value: data.totalUsers, icon: '👥', color: '#3B82F6', key: 'totalUsers' },
    { label: 'VIP用户', value: data.vipUsers, icon: '💎', color: '#F59E0B', key: 'vipUsers' },
    { label: '今日活跃', value: data.todayActive, icon: '🟢', color: '#22C55E', key: 'todayActive' },
    { label: '总收入', value: `¥${data.totalRevenue ?? 0}`, icon: '💰', color: '#EF4444', key: 'totalRevenue' },
    { label: '总激活码', value: data.totalCodes, icon: '🔑', color: '#8B5CF6', key: 'totalCodes' },
    { label: '已激活', value: data.activatedCodes, icon: '✅', color: '#06B6D4', key: 'activatedCodes' },
    { label: '待使用', value: data.pendingCodes, icon: '⏳', color: '#F97316', key: 'pendingCodes' },
    { label: '注册未付费', value: data.registeredNotPaid, icon: '📝', color: '#64748B', key: 'registeredNotPaid' },
  ] : [];

  const renderDetailRow = (item: any, metric: string) => {
    if (metric === 'totalRevenue') {
      return (
        <div className="drawer-detail-row" key={item.id}>
          <div className="detail-main">
            <span className="detail-email">{item.user_email || '—'}</span>
            <span className="detail-plan">{item.plan_name}</span>
          </div>
          <div className="detail-sub">
            <span className="detail-amount">¥{item.amount}</span>
            <span className="detail-date">{item.created_at?.slice(0, 16)}</span>
          </div>
        </div>
      );
    }
    if (metric.includes('Codes') || metric === 'pendingCodes') {
      return (
        <div className="drawer-detail-row" key={item.id}>
          <div className="detail-main">
            <code className="detail-code">{item.code}</code>
            <span className={`detail-status status-${item.status}`}>{item.status}</span>
          </div>
          <div className="detail-sub">
            <span>{item.plan_duration}</span>
            <span>{item.user_email || '未绑定'}</span>
            <span className="detail-date">{(item.activated_at || item.created_at)?.slice(0, 16)}</span>
          </div>
        </div>
      );
    }
    // Users
    return (
      <div className="drawer-detail-row" key={item.id}>
        <div className="detail-main">
          <span className="detail-email">{item.email}</span>
          <span className={`detail-status status-${item.vip_status || 'inactive'}`}>
            {item.vip_status === 'active' ? 'VIP' : '普通'}
          </span>
        </div>
        <div className="detail-sub">
          <span>注册: {item.created_at?.slice(0, 16) || '—'}</span>
          <span>登录: {item.last_login?.slice(0, 16) || '—'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-filters">
        <div className="filter-tabs">
          <button className={filterType === 'today' ? 'active' : ''} onClick={() => setFilterType('today')}>今日</button>
          <button className={filterType === 'year' ? 'active' : ''} onClick={() => setFilterType('year')}>年度</button>
        </div>
        {filterType === 'year' && (
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="year-select">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        )}
        <button className="refresh-btn" onClick={fetchDashboard}>🔄 刷新</button>
      </div>

      {loading ? (
        <div className="loading-center">
          <div className="spinner"></div>
          <span>加载中...</span>
        </div>
      ) : (
        <div className="dashboard-cards">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`dashboard-card ${activeMetric === card.key && drawerOpen ? 'card-active' : ''}`}
              style={{ '--card-color': card.color } as React.CSSProperties}
              onClick={() => handleCardClick(card.key)}
            >
              <div className="card-icon">{card.icon}</div>
              <div className="card-info">
                <span className="card-value">{card.value}</span>
                <span className="card-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 侧边抽屉 */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-panel">
            <div className="drawer-header">
              <h3>{drawerDetail?.title || '数据详情'}</h3>
              <span className="drawer-count">{drawerDetail?.total || 0} 条</span>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="drawer-body">
              {drawerLoading ? (
                <div className="loading-center" style={{ paddingTop: 60 }}>
                  <div className="spinner"></div>
                  <span>加载中...</span>
                </div>
              ) : drawerDetail && drawerDetail.data.length > 0 ? (
                drawerDetail.data.map((item: any) => renderDetailRow(item, activeMetric))
              ) : (
                <div className="empty-admin">暂无数据</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

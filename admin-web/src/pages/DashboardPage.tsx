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

export default function DashboardPage({ token }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterType, setFilterType] = useState<'today' | 'range' | 'year'>('today');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

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

  const cards = data ? [
    { label: '总用户数', value: data.totalUsers, icon: '👥', color: '#3B82F6' },
    { label: 'VIP用户', value: data.vipUsers, icon: '💎', color: '#F59E0B' },
    { label: '今日活跃', value: data.todayActive, icon: '🟢', color: '#22C55E' },
    { label: '总收入', value: `¥${data.totalRevenue}`, icon: '💰', color: '#EF4444' },
    { label: '总激活码', value: data.totalCodes, icon: '🔑', color: '#8B5CF6' },
    { label: '已激活', value: data.activatedCodes, icon: '✅', color: '#06B6D4' },
    { label: '待使用', value: data.pendingCodes, icon: '⏳', color: '#F97316' },
    { label: '注册未付费', value: data.registeredNotPaid, icon: '📝', color: '#64748B' },
  ] : [];

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
            <div key={i} className="dashboard-card" style={{ '--card-color': card.color } as React.CSSProperties}>
              <div className="card-icon">{card.icon}</div>
              <div className="card-info">
                <span className="card-value">{card.value}</span>
                <span className="card-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

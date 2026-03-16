import { NavLink, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  username: string;
  onLogout: () => void;
}

const navItems = [
  { path: '/', label: '数据看板', icon: '📊' },
  { path: '/plans', label: '套餐管理', icon: '💎' },
  { path: '/orders', label: '用户订单', icon: '📋' },
  { path: '/codes', label: '激活码管理', icon: '🔑' },
  { path: '/updates', label: '更新管理', icon: '🔄' },
  { path: '/qq-groups', label: 'QQ群管理', icon: '💬' },
  { path: '/agreements', label: '协议管理', icon: '📜' },
];

export default function Layout({ children, username, onLogout }: LayoutProps) {
  const location = useLocation();

  const currentTitle = navItems.find(n => n.path === location.pathname)?.label || '管理后台';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="自启精灵" className="logo-icon-img" />
          <span className="logo-text">自启精灵</span>
          <span className="logo-sub">管理后台</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{username.charAt(0).toUpperCase()}</div>
            <span className="sidebar-user-name">{username}</span>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>退出登录</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="topbar-title">{currentTitle}</h1>
          <div className="topbar-right">
            <span className="topbar-time">{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </div>
    </div>
  );
}

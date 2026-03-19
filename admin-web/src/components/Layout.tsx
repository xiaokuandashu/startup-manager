import { NavLink, useLocation } from 'react-router-dom';
import { ReactNode, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  username: string;
  onLogout: () => void;
  token: string;
  onUsernameChange?: (newUsername: string) => void;
}

const navItems = [
  { path: '/', label: '数据看板', icon: '📊' },
  { path: '/plans', label: '套餐管理', icon: '💎' },
  { path: '/orders', label: '用户订单', icon: '📋' },
  { path: '/codes', label: '激活码管理', icon: '🔑' },
  { path: '/marketplace', label: '市场管理', icon: '🏪' },
  { path: '/credits', label: '积分管理', icon: '💰' },
  { path: '/updates', label: '更新管理', icon: '🔄' },
  { path: '/qq-groups', label: 'QQ群管理', icon: '💬' },
  { path: '/agreements', label: '协议管理', icon: '📜' },
  { path: '/deepseek', label: 'DeepSeek 配置', icon: '🤖' },
];

export default function Layout({ children, username, onLogout, token, onUsernameChange }: LayoutProps) {
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const currentTitle = navItems.find(n => n.path === location.pathname)?.label || '管理后台';

  const handleProfileSave = async () => {
    if (!oldPwd) { setProfileMsg('请输入当前密码验证身份'); return; }
    if (!newUsername.trim() && !newPwd) { setProfileMsg('请填写新用户名或新密码'); return; }
    if (newPwd && newPwd.length < 6) { setProfileMsg('新密码至少6位'); return; }
    setProfileLoading(true);
    setProfileMsg('');
    try {
      const resp = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          oldPassword: oldPwd,
          newUsername: newUsername.trim() || undefined,
          newPassword: newPwd || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) { setProfileMsg(data.error); return; }
      setProfileMsg('✅ ' + data.message);
      if (data.username && onUsernameChange) {
        onUsernameChange(data.username);
      }
      setTimeout(() => { setShowProfile(false); setProfileMsg(''); }, 1500);
    } catch { setProfileMsg('网络错误'); }
    finally { setProfileLoading(false); }
  };

  const openProfile = () => {
    setNewUsername(username);
    setOldPwd('');
    setNewPwd('');
    setProfileMsg('');
    setShowProfile(true);
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="任务精灵" className="logo-icon-img" />
          <span className="logo-text">任务精灵</span>
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
          <div className="sidebar-user" onClick={openProfile} style={{ cursor: 'pointer' }} title="点击修改用户名/密码">
            <div className="sidebar-user-avatar">{username.charAt(0).toUpperCase()}</div>
            <span className="sidebar-user-name">{username}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>⚙️</span>
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

      {/* 管理员设置弹窗 */}
      {showProfile && (
        <div className="profile-modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <h3>账户设置</h3>
            <div className="modal-form-admin">
              <label>当前密码（必填，用于验证身份）</label>
              <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="请输入当前密码" />
              <label>新用户名</label>
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="留空则不修改" />
              <label>新密码（至少6位，留空则不修改）</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="留空则不修改" />
            </div>
            {profileMsg && <p style={{ fontSize: 13, color: profileMsg.startsWith('✅') ? '#22c55e' : '#ef4444', marginTop: 14 }}>{profileMsg}</p>}
            <div className="modal-actions-admin" style={{ marginTop: 20 }}>
              <button className="btn-cancel-admin" onClick={() => setShowProfile(false)}>取消</button>
              <button className="btn-primary" onClick={handleProfileSave} disabled={profileLoading}>
                {profileLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

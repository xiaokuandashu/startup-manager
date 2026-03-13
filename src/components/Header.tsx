import React, { useState, useEffect, useRef } from 'react';
import { PageType } from '../types';
import UserDropdown from './UserDropdown';

interface UserInfo {
  id: string;
  phone: string;
  vipStatus: string;
  vipExpireDate?: string;
}

interface HeaderProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogin: () => void;
  onVip: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: UserInfo | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentPage, onPageChange, searchQuery, onSearchChange,
  onLogin, onVip, theme, onToggleTheme, user, onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pages: { key: PageType; label: string }[] = [
    { key: 'home', label: '主页' },
    { key: 'log', label: '日志' },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        {pages.map(p => (
          <button
            key={p.key}
            className={`page-tab ${currentPage === p.key ? 'active' : ''}`}
            onClick={() => onPageChange(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="header-center">
        <div className="search-bar">
          <input
            placeholder="搜索任务名称"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="search-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
        </div>
      </div>

      <div className="header-right">
        <button className="vip-badge" onClick={onVip}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
          {user?.vipStatus === 'active' ? '会员用户' : '成为会员，激活全部权益'}
        </button>

        {/* 主题切换按钮 */}
        <button className="theme-toggle-btn" onClick={onToggleTheme} title={theme === 'light' ? '切换到暗夜模式' : '切换到亮色模式'}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <button className="settings-btn" onClick={() => onPageChange('settings')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>

        <div className="avatar-wrapper" ref={dropdownRef}>
          <button className="user-avatar-btn" onClick={() => setShowUserDropdown(!showUserDropdown)}>
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="18" fill="#e0e0e0"/>
              <circle cx="20" cy="16" r="7" fill="#bdbdbd"/>
              <path d="M6 36 Q10 24 20 24 Q30 24 34 36" fill="#bdbdbd"/>
            </svg>
          </button>
          {showUserDropdown && (
            <UserDropdown
              onSettings={() => { setShowUserDropdown(false); onPageChange('settings'); }}
              onLogin={() => { setShowUserDropdown(false); onLogin(); }}
              user={user}
              onLogout={() => { setShowUserDropdown(false); onLogout(); }}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

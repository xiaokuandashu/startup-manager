import React, { useState, useEffect, useRef } from 'react';
import { PageType } from '../types';
import UserDropdown from './UserDropdown';
import AvatarCropper from './AvatarCropper';

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

const AVATAR_KEY = 'user_avatar';

const Header: React.FC<HeaderProps> = ({
  currentPage, onPageChange, searchQuery, onSearchChange,
  onLogin, onVip, theme, onToggleTheme, user, onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 加载自定义头像
  useEffect(() => {
    const saved = localStorage.getItem(AVATAR_KEY);
    if (saved) setCustomAvatar(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarSave = (croppedImage: string) => {
    setCustomAvatar(croppedImage);
    localStorage.setItem(AVATAR_KEY, croppedImage);
  };

  const avatarSrc = customAvatar || '/icon/icon_touxiangmoren.svg';

  const pages: { key: PageType; label: string }[] = [
    { key: 'home', label: '主页' },
    { key: 'log', label: '日志' },
  ];

  return (
    <>
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

          <button className="theme-toggle-btn" onClick={onToggleTheme} title={theme === 'light' ? '切换到暗夜模式' : '切换到亮色模式'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <div className="avatar-wrapper" ref={dropdownRef}>
            <button className="user-avatar-btn" onClick={() => setShowUserDropdown(!showUserDropdown)}>
              <img src={avatarSrc} alt="avatar" width="36" height="36" className="user-avatar-img" />
            </button>
            {showUserDropdown && (
              <UserDropdown
                onSettings={() => { setShowUserDropdown(false); onPageChange('settings'); }}
                onLogin={() => { setShowUserDropdown(false); onLogin(); }}
                user={user}
                onLogout={() => { setShowUserDropdown(false); onLogout(); }}
                avatarSrc={avatarSrc}
                onChangeAvatar={() => { setShowUserDropdown(false); setShowAvatarCropper(true); }}
              />
            )}
          </div>
        </div>
      </header>

      <AvatarCropper
        isOpen={showAvatarCropper}
        onClose={() => setShowAvatarCropper(false)}
        onSave={handleAvatarSave}
      />
    </>
  );
};

export default Header;

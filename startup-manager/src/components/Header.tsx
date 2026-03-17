import React, { useState, useEffect, useRef } from 'react';
import { PageType, ToolTab } from '../types';
import UserDropdown from './UserDropdown';
import AvatarCropper from './AvatarCropper';
import { t, Language } from '../i18n';
import { Search, Star, Moon, Sun, Pin, PinOff, X } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
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
  lang: Language;
  // 工具标签页
  toolTabs: ToolTab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabLock: (tabId: string) => void;
  onTabDragEnd: (fromId: string, toId: string) => void;
}

const AVATAR_KEY = 'user_avatar';

const Header: React.FC<HeaderProps> = ({
  currentPage, onPageChange, searchQuery, onSearchChange,
  onLogin, onVip, theme, onToggleTheme, user, onLogout, lang,
  toolTabs, activeTabId, onTabClick, onTabClose, onTabLock, onTabDragEnd,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          {/* 首页 tab */}
          <button
            className={`page-tab ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onPageChange('home')}
          >
            {t('home', lang)}
          </button>

          {/* 工具 tab */}
          <button
            className={`page-tab ${currentPage === 'tools' && !activeTabId ? 'active' : ''}`}
            onClick={() => { onPageChange('tools'); }}
          >
            工具
          </button>

          {/* 已打开的工具标签（浏览器风格，紧跟在工具后面） */}
          {toolTabs.map(tab => (
            <div
              key={tab.id}
              className={`page-tab tool-tab-inline ${activeTabId === tab.id ? 'active' : ''} ${dragTabId === tab.id ? 'dragging' : ''}`}
              draggable
              onClick={() => onTabClick(tab.id)}
              onDragStart={() => setDragTabId(tab.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragTabId && dragTabId !== tab.id) {
                  onTabDragEnd(dragTabId, tab.id);
                }
                setDragTabId(null);
              }}
              onDragEnd={() => setDragTabId(null)}
            >
              <span className="tool-tab-inline-icon">{tab.icon}</span>
              <span className="tool-tab-inline-title">{tab.title}</span>
              <button
                className={`tool-tab-inline-pin ${tab.locked ? 'locked' : ''}`}
                onClick={e => { e.stopPropagation(); onTabLock(tab.id); }}
                title={tab.locked ? '取消锁定' : '锁定'}
              >
                {tab.locked ? <Pin size={12} /> : <PinOff size={12} />}
              </button>
              {!tab.locked && (
                <button
                  className="tool-tab-inline-close"
                  onClick={e => { e.stopPropagation(); onTabClose(tab.id); }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="header-right">
          {/* 搜索栏（缩短，放在VIP前面） */}
          <div className="search-bar-compact">
            <Search size={14} />
            <input
              placeholder={t('search', lang)}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <button className="vip-badge" onClick={onVip}>
            <Star size={16} />
            {user?.vipStatus === 'active' ? t('vip', lang) : t('purchaseVip', lang)}
          </button>

          <button className="theme-toggle-btn" onClick={onToggleTheme} title={theme === 'light' ? t('darkMode', lang) : t('lightMode', lang)}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
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

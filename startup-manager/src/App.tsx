import React, { useState, useEffect } from 'react';
import './App.css';
import { PageType, ToolType, ToolTab } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LogPage from './pages/LogPage';
import SettingsPage from './pages/SettingsPage';
import AiAssistantPage from './pages/AiAssistantPage';
import RecordingPage from './pages/RecordingPage';
import MarketplacePage from './pages/MarketplacePage';
import ToolsPage from './pages/ToolsPage';
import LoginModal from './components/LoginModal';
import VipModal from './components/VipModal';
import UpdateChecker from './components/UpdateChecker';
import { Language, getCurrentLanguage } from './i18n';

interface UserInfo {
  id: string;
  email: string;
  vipStatus: string;
  vipExpireDate?: string;
}

type ThemeMode = 'light' | 'dark' | 'auto';

// 获取系统主题
const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// 同步 Tauri 窗口标题栏主题
const syncTitleBarTheme = async (resolvedTheme: 'light' | 'dark', isAuto: boolean = false) => {
  try {
    if ((window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const theme = isAuto ? 'auto' : resolvedTheme;
      await invoke('set_window_theme', { theme });
    }
  } catch (e) {
    console.error('Set titlebar theme failed:', e);
  }
};

const TOOL_META: Record<ToolType, { title: string; icon: string }> = {
  ai: { title: 'AI 助手', icon: '🤖' },
  recording: { title: '操作录制', icon: '🎬' },
  marketplace: { title: '任务市场', icon: '🏪' },
  log: { title: '运行日志', icon: '📋' },
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  // 工具标签页状态
  const [toolTabs, setToolTabs] = useState<ToolTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showVip, setShowVip] = useState(false);

  // 全局语言状态
  const [lang, setLang] = useState<Language>(getCurrentLanguage());

  // 主题管理: light / dark / auto
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('themeMode') as ThemeMode) || 'light';
  });

  // 解析后的实际主题
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode || 'light';
    return saved === 'auto' ? getSystemTheme() : saved as 'light' | 'dark';
  });

  // 用户认证
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  // 主题变更处理
  useEffect(() => {
    const actual = themeMode === 'auto' ? getSystemTheme() : themeMode;
    setResolvedTheme(actual);
    document.documentElement.setAttribute('data-theme', actual);
    localStorage.setItem('themeMode', themeMode);
    syncTitleBarTheme(actual, themeMode === 'auto');

    // 监听系统主题变化
    if (themeMode === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const t = e.matches ? 'dark' : 'light';
        setResolvedTheme(t);
        document.documentElement.setAttribute('data-theme', t);
        syncTitleBarTheme(t, true);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [themeMode]);

  const handleThemeModeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const toggleTheme = () => {
    if (themeMode === 'auto') {
      setThemeMode('light');
    } else {
      setThemeMode(prev => prev === 'light' ? 'dark' : 'light');
    }
  };

  const handleLoginSuccess = (userInfo: UserInfo, authToken: string) => {
    setUser(userInfo);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userInfo));
    localStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const checkVipBeforeAdd = (): boolean => {
    if (!user) {
      setShowLogin(true);
      return false;
    }
    if (user.vipStatus !== 'active') {
      setShowVip(true);
      return false;
    }
    return true;
  };

  return (
    <div className="app-container">
      {currentPage !== 'settings' && (
        <Header
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogin={() => setShowLogin(true)}
          onVip={() => setShowVip(true)}
          theme={resolvedTheme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          lang={lang}
        />
      )}

      {/* 工具标签栏 */}
      {toolTabs.length > 0 && (
        <div className="tool-tab-bar">
          {toolTabs.map(tab => (
            <div
              key={tab.id}
              className={`tool-tab ${activeTabId === tab.id ? 'active' : ''} ${dragTabId === tab.id ? 'dragging' : ''}`}
              draggable
              onClick={() => { setActiveTabId(tab.id); setCurrentPage('tools'); }}
              onDragStart={() => setDragTabId(tab.id)}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={() => {
                if (dragTabId && dragTabId !== tab.id) {
                  setToolTabs(prev => {
                    const arr = [...prev];
                    const fromIdx = arr.findIndex(t => t.id === dragTabId);
                    const toIdx = arr.findIndex(t => t.id === tab.id);
                    if (fromIdx >= 0 && toIdx >= 0) {
                      const [moved] = arr.splice(fromIdx, 1);
                      arr.splice(toIdx, 0, moved);
                    }
                    return arr;
                  });
                }
                setDragTabId(null);
              }}
              onDragEnd={() => setDragTabId(null)}
            >
              <span className="tool-tab-icon">{tab.icon}</span>
              <span className="tool-tab-title">{tab.title}</span>
              <button
                className={`tool-tab-lock ${tab.locked ? 'locked' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setToolTabs(prev => prev.map(t => t.id === tab.id ? { ...t, locked: !t.locked } : t));
                }}
                title={tab.locked ? '取消锁定' : '锁定标签'}
              >
                {tab.locked ? '📌' : '📍'}
              </button>
              {!tab.locked && (
                <button
                  className="tool-tab-close"
                  onClick={e => {
                    e.stopPropagation();
                    setToolTabs(prev => prev.filter(t => t.id !== tab.id));
                    if (activeTabId === tab.id) {
                      const remaining = toolTabs.filter(t => t.id !== tab.id);
                      setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
                      if (remaining.length === 0) setCurrentPage('tools');
                    }
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <main className="app-main">
        {currentPage === 'home' && (
          <HomePage
            searchQuery={searchQuery}
            checkVipBeforeAdd={checkVipBeforeAdd}
            lang={lang}
          />
        )}
        {currentPage === 'tools' && !activeTabId && (
          <ToolsPage onOpenTool={(type: ToolType) => {
            const existing = toolTabs.find(t => t.type === type);
            if (existing) {
              setActiveTabId(existing.id);
            } else {
              const meta = TOOL_META[type];
              const newTab: ToolTab = {
                id: `${type}_${Date.now()}`,
                type,
                title: meta.title,
                icon: meta.icon,
                locked: false,
              };
              setToolTabs(prev => [...prev, newTab]);
              setActiveTabId(newTab.id);
            }
          }} />
        )}
        {currentPage === 'tools' && activeTabId && (() => {
          const tab = toolTabs.find(t => t.id === activeTabId);
          if (!tab) return null;
          switch (tab.type) {
            case 'ai': return <AiAssistantPage lang={lang} />;
            case 'recording': return <RecordingPage lang={lang} />;
            case 'marketplace': return <MarketplacePage lang={lang} />;
            case 'log': return <LogPage searchQuery={searchQuery} lang={lang} />;
            default: return null;
          }
        })()}
        {currentPage === 'settings' && (
          <SettingsPage
            onBack={() => setCurrentPage('home')}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
            user={user}
            onLanguageChange={setLang}
          />
        )}
      </main>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
        lang={lang}
      />
      <VipModal
        isOpen={showVip}
        onClose={() => setShowVip(false)}
        token={token}
        onActivated={(expireDate) => {
          if (user) {
            const updated = { ...user, vipStatus: 'active', vipExpireDate: expireDate };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
          }
        }}
        lang={lang}
      />
      <UpdateChecker />
    </div>
  );
};

export default App;

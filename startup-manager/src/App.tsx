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
import { Bot, Clapperboard, Store, ScrollText } from 'lucide-react';

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

const TOOL_META: Record<ToolType, { title: string; icon: React.ReactNode }> = {
  ai: { title: 'AI 助手', icon: <Bot size={14} /> },
  recording: { title: '操作录制', icon: <Clapperboard size={14} /> },
  marketplace: { title: '任务市场', icon: <Store size={14} /> },
  log: { title: '运行日志', icon: <ScrollText size={14} /> },
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  // 工具标签页状态
  const [toolTabs, setToolTabs] = useState<ToolTab[]>(() => {
    try {
      const saved = localStorage.getItem('toolTabs');
      if (saved) {
        const parsed = JSON.parse(saved) as ToolTab[];
        // 只恢复被锁定（固定）的标签页
        return parsed.filter(tab => tab.locked).map(tab => {
          const meta = TOOL_META[tab.type];
          return meta ? { ...tab, icon: meta.icon, title: tab.title || meta.title } : tab;
        });
      }
      return [];
    } catch {
      return [];
    }
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return localStorage.getItem('activeTabId') || null;
  });
  const [showLogin, setShowLogin] = useState(false);
  const [showVip, setShowVip] = useState(false);

  // 监听标签页变动，只保存被锁定的标签
  useEffect(() => {
    const lockedTabs = toolTabs.filter(t => t.locked);
    localStorage.setItem('toolTabs', JSON.stringify(lockedTabs));
  }, [toolTabs]);

  useEffect(() => {
    if (activeTabId) {
      localStorage.setItem('activeTabId', activeTabId);
    } else {
      localStorage.removeItem('activeTabId');
    }
  }, [activeTabId]);

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
    // 启动设备心跳上报
    startHeartbeat(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // 启动设备心跳上报
  const startHeartbeat = async (authToken: string) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('start_device_heartbeat', { token: authToken });
        console.log('[heartbeat] 设备心跳已启动');
      }
    } catch (e) {
      console.error('[heartbeat] 启动失败:', e);
    }
  };

  // 应用启动 + 已有 token 时自动启动心跳
  useEffect(() => {
    if (token) {
      startHeartbeat(token);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          onPageChange={(page) => { setCurrentPage(page); if (page === 'tools') setActiveTabId(null); }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onLogin={() => setShowLogin(true)}
          onVip={() => setShowVip(true)}
          theme={resolvedTheme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          lang={lang}
          toolTabs={toolTabs}
          activeTabId={activeTabId}
          onTabClick={(tabId) => { setActiveTabId(tabId); setCurrentPage('tools'); }}
          onTabClose={(tabId) => {
            setToolTabs(prev => prev.filter(t => t.id !== tabId));
            if (activeTabId === tabId) {
              const remaining = toolTabs.filter(t => t.id !== tabId);
              setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
              if (remaining.length === 0) setCurrentPage('tools');
            }
          }}
          onTabLock={(tabId) => {
            setToolTabs(prev => prev.map(t => t.id === tabId ? { ...t, locked: !t.locked } : t));
          }}
          onTabDragEnd={(fromId, toId) => {
            setToolTabs(prev => {
              const arr = [...prev];
              const fromIdx = arr.findIndex(t => t.id === fromId);
              const toIdx = arr.findIndex(t => t.id === toId);
              if (fromIdx >= 0 && toIdx >= 0) {
                const [moved] = arr.splice(fromIdx, 1);
                arr.splice(toIdx, 0, moved);
              }
              return arr;
            });
          }}
        />
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

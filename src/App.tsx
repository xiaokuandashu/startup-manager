import React, { useState, useEffect } from 'react';
import './App.css';
import { PageType } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LogPage from './pages/LogPage';
import SettingsPage from './pages/SettingsPage';
import LoginModal from './components/LoginModal';
import VipModal from './components/VipModal';

interface UserInfo {
  id: string;
  phone: string;
  vipStatus: string;
  vipExpireDate?: string;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showVip, setShowVip] = useState(false);

  // 主题管理
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // 用户认证
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
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

  // 添加任务前检查 VIP 权限
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
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
        />
      )}

      <main className="app-main">
        {currentPage === 'home' && (
          <HomePage
            searchQuery={searchQuery}
            checkVipBeforeAdd={checkVipBeforeAdd}
          />
        )}
        {currentPage === 'log' && <LogPage searchQuery={searchQuery} />}
        {currentPage === 'settings' && (
          <SettingsPage
            onBack={() => setCurrentPage('home')}
            theme={theme}
            onThemeChange={setTheme}
          />
        )}
      </main>

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
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
      />
    </div>
  );
};

export default App;

import { useState } from 'react';

interface LoginPageProps {
  onLogin: (token: string, username: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('请输入账户和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || '登录失败');
        return;
      }
      onLogin(data.token, data.username);
    } catch {
      setError('网络连接失败，请确认后端服务已启动');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <img src="/logo.png" alt="自启精灵" className="login-logo-img" />
          <h1>自启精灵</h1>
          <p>管理后台登录</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="login-field-group">
            <label>账户</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入管理员账户"
              autoFocus
            />
          </div>
          <div className="login-field-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '登录中...' : '登  录'}
          </button>
          
        </form>
      </div>
    </div>
  );
}

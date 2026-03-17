import React, { useState } from 'react';
import { Language } from '../i18n';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; email: string; vipStatus: string; vipExpireDate?: string }, token: string) => void;
  lang?: Language;
}

const API_BASE = 'https://bt.aacc.fun:8888/api';

type TabType = 'code' | 'password' | 'register' | 'forgot';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, lang = 'zh' }) => {
  const [tab, setTab] = useState<TabType>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAgreement, setShowAgreement] = useState<'user' | 'privacy' | null>(null);
  const [agreementContent, setAgreementContent] = useState('');

  if (!isOpen) return null;

  const isZh = lang === 'zh';

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError(isZh ? '请输入正确的邮箱地址' : 'Please enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error); return; }
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch {
      setError(isZh ? '网络连接失败' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      let url: string;
      let body: any;
      if (tab === 'code') {
        url = `${API_BASE}/auth/login`;
        body = { email, code };
      } else {
        url = `${API_BASE}/auth/login-password`;
        body = { email, password };
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        // 检测未注册，自动跳转注册页
        if (data.code === 'NOT_REGISTERED') {
          setTab('register');
          setError('');
          setSuccessMsg(isZh ? '该邮箱未注册，请先注册账号' : 'Email not registered, please register first');
          setTimeout(() => setSuccessMsg(''), 3000);
          return;
        }
        setError(data.error);
        return;
      }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch {
      setError(isZh ? '网络连接失败，请检查后端服务' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error); return; }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch {
      setError(isZh ? '网络连接失败' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error); return; }
      setSuccessMsg(isZh ? '密码重置成功，请使用新密码登录' : 'Password reset successfully');
      setTimeout(() => { setTab('password'); setSuccessMsg(''); }, 2000);
    } catch {
      setError(isZh ? '网络连接失败' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const tabLabels = {
    code: isZh ? '验证码登录' : 'Code Login',
    password: isZh ? '密码登录' : 'Password Login',
    register: isZh ? '注册账号' : 'Register',
    forgot: isZh ? '找回密码' : 'Reset Password',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="login-wave-bg">
          <svg viewBox="0 0 400 120" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
            <path d="M0 80 Q100 40 200 70 T400 60 V120 H0Z" fill="rgba(255,255,255,0.15)"/>
            <path d="M0 90 Q100 60 200 80 T400 75 V120 H0Z" fill="rgba(255,255,255,0.1)"/>
          </svg>
          <span className="login-title">{tabLabels[tab]}</span>
        </div>

        <div className="login-body">
          {/* Tab 切换 */}
          {(tab === 'code' || tab === 'password') && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <button
                style={{ flex: 1, padding: '8px 0', border: 'none', borderBottom: tab === 'code' ? '2px solid #0091FF' : '2px solid transparent', background: 'none', color: tab === 'code' ? '#0091FF' : '#ccc', cursor: 'pointer', fontWeight: tab === 'code' ? 600 : 400, fontSize: 13 }}
                onClick={() => { setTab('code'); setError(''); }}
              >
                {isZh ? '验证码登录' : 'Code Login'}
              </button>
              <button
                style={{ flex: 1, padding: '8px 0', border: 'none', borderBottom: tab === 'password' ? '2px solid #0091FF' : '2px solid transparent', background: 'none', color: tab === 'password' ? '#0091FF' : '#ccc', cursor: 'pointer', fontWeight: tab === 'password' ? 600 : 400, fontSize: 13 }}
                onClick={() => { setTab('password'); setError(''); }}
              >
                {isZh ? '密码登录' : 'Password Login'}
              </button>
            </div>
          )}

          <p className="login-desc">
            {tab === 'register'
              ? (isZh ? '注册新账号，请输入邮箱、验证码和密码' : 'Register a new account')
              : tab === 'forgot'
              ? (isZh ? '重置密码，请输入邮箱、验证码和新密码' : 'Reset your password')
              : (isZh ? '请登录避免更换设备会员遗失，后续可使用该邮箱登录使用会员权益' : 'Login to keep your membership when switching devices')}
          </p>

          {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          {successMsg && <p style={{ color: '#22C55E', fontSize: 13, marginBottom: 8 }}>{successMsg}</p>}

          {/* 邮箱输入 */}
          <div className="login-field">
            <input
              type="email"
              placeholder={isZh ? '请输入邮箱地址' : 'Email address'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* 验证码输入 (code/register/forgot 模式) */}
          {(tab === 'code' || tab === 'register' || tab === 'forgot') && (
            <div className="login-field">
              <input
                type="text"
                placeholder={isZh ? '请输入验证码' : 'Verification code'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <button className="get-code-btn" type="button" onClick={handleSendCode} disabled={countdown > 0 || loading}>
                {countdown > 0 ? `${countdown}s` : (codeSent ? (isZh ? '重新发送' : 'Resend') : (isZh ? '获取验证码' : 'Get Code'))}
              </button>
            </div>
          )}

          {/* 密码输入 (password/register 模式) */}
          {(tab === 'password' || tab === 'register') && (
            <div className="login-field">
              <input
                type="password"
                placeholder={isZh ? '请输入密码' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {/* 新密码输入 (forgot 模式) */}
          {tab === 'forgot' && (
            <div className="login-field">
              <input
                type="password"
                placeholder={isZh ? '请输入新密码(至少6位)' : 'New password (min 6 chars)'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          )}

          {/* 协议勾选 */}
          {(tab === 'code' || tab === 'password' || tab === 'register') && (
            <label className="login-agree">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                {isZh ? '登录即同意' : 'I agree to '}
                <a href="#" onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const resp = await fetch(`${API_BASE}/agreements/user`);
                    const data = await resp.json();
                    setAgreementContent(isZh ? data.content_zh : data.content_en);
                    setShowAgreement('user');
                  } catch { setAgreementContent(isZh ? '加载失败' : 'Failed to load'); setShowAgreement('user'); }
                }} style={{ color: '#0091FF', textDecoration: 'underline', cursor: 'pointer' }}>
                  {isZh ? '《用户协议》' : 'Terms of Service'}
                </a>
                {isZh ? '和' : ' and '}
                <a href="#" onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const resp = await fetch(`${API_BASE}/agreements/privacy`);
                    const data = await resp.json();
                    setAgreementContent(isZh ? data.content_zh : data.content_en);
                    setShowAgreement('privacy');
                  } catch { setAgreementContent(isZh ? '加载失败' : 'Failed to load'); setShowAgreement('privacy'); }
                }} style={{ color: '#0091FF', textDecoration: 'underline', cursor: 'pointer' }}>
                  {isZh ? '《隐私政策》' : 'Privacy Policy'}
                </a>
              </span>
            </label>
          )}

          {/* 主按钮 */}
          <button
            className="btn-login-full"
            disabled={tab === 'forgot' ? loading : (!agreed || loading)}
            onClick={
              tab === 'register' ? handleRegister
              : tab === 'forgot' ? handleForgot
              : handleLogin
            }
          >
            {loading
              ? (isZh ? '处理中...' : 'Processing...')
              : tab === 'register' ? (isZh ? '注册' : 'Register')
              : tab === 'forgot' ? (isZh ? '重置密码' : 'Reset')
              : (isZh ? '登录' : 'Login')}
          </button>

          {/* 底部链接 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12 }}>
            {(tab === 'code' || tab === 'password') && (
              <>
                <button style={{ background: 'none', border: 'none', color: '#0091FF', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  onClick={() => { setTab('register'); setError(''); }}>
                  {isZh ? '注册新账号' : 'Register'}
                </button>
                <button style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  onClick={() => { setTab('forgot'); setError(''); }}>
                  {isZh ? '忘记密码？' : 'Forgot password?'}
                </button>
              </>
            )}
            {(tab === 'register' || tab === 'forgot') && (
              <button style={{ background: 'none', border: 'none', color: '#0091FF', cursor: 'pointer', fontSize: 12, padding: 0 }}
                onClick={() => { setTab('code'); setError(''); setSuccessMsg(''); }}>
                {isZh ? '← 返回登录' : '← Back to login'}
              </button>
            )}
          </div>
        </div>

        {/* 协议弹窗 */}
        {showAgreement && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.97)', borderRadius: 12,
            display: 'flex', flexDirection: 'column', padding: 20, zIndex: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15, color: '#333' }}>
                {showAgreement === 'user' ? (isZh ? '用户协议' : 'Terms of Service') : (isZh ? '隐私政策' : 'Privacy Policy')}
              </h4>
              <button onClick={() => setShowAgreement(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', fontSize: 12, lineHeight: 1.8, color: '#555', whiteSpace: 'pre-wrap' }}>
              {agreementContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;

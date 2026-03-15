import React, { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: string; phone: string; vipStatus: string; vipExpireDate?: string }, token: string) => void;
  lang?: string;
}

const API_BASE = 'http://aacc.fun:3001/api';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGetCode = () => {
    if (phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }
    setCodeSent(true);
    setCode('1234'); // 模拟验证码
    setError('');
  };

  const handleLogin = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || '登录失败');
        return;
      }
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch {
      setError('网络连接失败，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
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
          <span className="login-title">登陆</span>
        </div>

        <div className="login-body">
          <p className="login-desc">请登陆避免更换设备会员遗失，后续可使用该手机号登陆使用会员权益</p>
          {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <div className="login-field">
            <input
              type="tel"
              placeholder="请输入11位手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={11}
            />
            <button className="get-code-btn" type="button" onClick={handleGetCode}>
              {codeSent ? '已发送' : '获取验证码'}
            </button>
          </div>
          <div className="login-field">
            <input
              type="text"
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </div>
          <label className="login-agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>登陆即同意《用户协议》</span>
          </label>
          <button
            className="btn-login-full"
            disabled={!agreed || phone.length < 11 || loading}
            onClick={handleLogin}
          >
            {loading ? '登录中...' : '登陆'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

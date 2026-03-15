import React, { useState, useEffect } from 'react';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onActivated: (expireDate: string) => void;
  lang?: string;
}

interface Plan {
  id: number;
  name: string;
  duration: string;
  original_price: number;
  actual_price: number;
  is_limited: number;
}

const API_BASE = 'http://aacc.fun:3001/api';

const VipModal: React.FC<VipModalProps> = ({ isOpen, onClose, token, onActivated }) => {
  const [activeTab, setActiveTab] = useState<'purchase' | 'activate'>('purchase');
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [activationCode, setActivationCode] = useState('');
  const [activateLoading, setActivateLoading] = useState(false);
  const [activateMsg, setActivateMsg] = useState('');
  const [activateError, setActivateError] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // 从服务端加载套餐价格
  useEffect(() => {
    if (!isOpen) return;
    setPlansLoading(true);
    fetch(`${API_BASE}/plans`)
      .then(r => r.json())
      .then((data: Plan[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        } else {
          // 回退默认
          setPlans([
            { id: 0, name: '一个月会员', duration: '1month', original_price: 9.9, actual_price: 6.8, is_limited: 0 },
            { id: 1, name: '三个月会员', duration: '3month', original_price: 29.7, actual_price: 16.6, is_limited: 0 },
            { id: 2, name: '一年会员', duration: '1year', original_price: 118.8, actual_price: 36.9, is_limited: 0 },
            { id: 3, name: '永久会员', duration: 'permanent', original_price: 399.9, actual_price: 66.6, is_limited: 1 },
          ]);
        }
      })
      .catch(() => {
        setPlans([
          { id: 0, name: '一个月会员', duration: '1month', original_price: 9.9, actual_price: 6.8, is_limited: 0 },
          { id: 1, name: '三个月会员', duration: '3month', original_price: 29.7, actual_price: 16.6, is_limited: 0 },
          { id: 2, name: '一年会员', duration: '1year', original_price: 118.8, actual_price: 36.9, is_limited: 0 },
          { id: 3, name: '永久会员', duration: 'permanent', original_price: 399.9, actual_price: 66.6, is_limited: 1 },
        ]);
      })
      .finally(() => setPlansLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const benefits = [
    { icon: '🚀', label: '无限创建启动任务' },
    { icon: '📅', label: '全部定时类型' },
    { icon: '⚡', label: '批量导入导出' },
    { icon: '🔔', label: '执行通知提醒' },
    { icon: '📊', label: '详细日志记录' },
    { icon: '🛡️', label: '优先技术支持' },
  ];

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      setActivateError('请输入激活码');
      return;
    }
    if (!token) {
      setActivateError('请先登录后再激活');
      return;
    }
    setActivateLoading(true);
    setActivateError('');
    setActivateMsg('');
    try {
      const resp = await fetch(`${API_BASE}/activation/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: activationCode.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setActivateError(data.error || '激活失败');
        return;
      }
      setActivateMsg(`激活成功！会员到期时间: ${data.expireDate}`);
      onActivated(data.expireDate);
    } catch {
      setActivateError('网络连接失败，请检查后端服务');
    } finally {
      setActivateLoading(false);
    }
  };

  const currentPlan = plans[selectedPlan] || plans[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vip-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vip-header-fixed">
          <div className="vip-header">
            <h2>⭐ 成为会员</h2>
            <button className="modal-close vip-close" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="vip-tabs">
            <button className={`vip-tab ${activeTab === 'purchase' ? 'active' : ''}`} onClick={() => setActiveTab('purchase')}>购买会员</button>
            <button className={`vip-tab ${activeTab === 'activate' ? 'active' : ''}`} onClick={() => setActiveTab('activate')}>激活码</button>
          </div>
        </div>

        <div className="vip-scroll-body">

        {activeTab === 'purchase' ? (
          <div className="vip-purchase-body">
            <div className="vip-user-bar">
              <span className="vip-status">非会员</span>
              <span className="vip-user-msg">开通会员解锁全部功能</span>
              {!token && <button className="btn-login-sm">登录</button>}
            </div>

            {plansLoading ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>加载套餐中...</div>
            ) : (
            <div className="plan-cards">
              {plans.map((plan, i) => {
                const discount = plan.original_price > plan.actual_price
                  ? `立减${(plan.original_price - plan.actual_price).toFixed(1)}`
                  : '';
                return (
                  <div key={plan.id} className={`plan-card ${selectedPlan === i ? 'selected' : ''}`} onClick={() => setSelectedPlan(i)}>
                    {discount && <span className="plan-discount">{discount}</span>}
                    {plan.is_limited ? <span className="plan-limited">限时</span> : null}
                    <span className="plan-name">{plan.name}</span>
                    <div className="plan-price">
                      ¥<strong>{plan.actual_price}</strong>
                      <s>¥{plan.original_price}</s>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            <div className="vip-benefits">
              <h4 className="benefits-title">会员 <span className="n-plus">N+</span> 项权益</h4>
              <div className="benefits-grid">
                {benefits.map((b, i) => (
                  <div key={i} className="benefit-item">
                    <span className="benefit-icon">{b.icon}</span>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pay-section">
              <div className="pay-methods">
                <label className={`pay-method ${payMethod === 'wechat' ? 'active' : ''}`} onClick={() => setPayMethod('wechat')}>
                  <input type="radio" name="pay" checked={payMethod === 'wechat'} readOnly />
                  💬 微信支付
                </label>
                <label className={`pay-method ${payMethod === 'alipay' ? 'active' : ''}`} onClick={() => setPayMethod('alipay')}>
                  <input type="radio" name="pay" checked={payMethod === 'alipay'} readOnly />
                  🔵 支付宝
                </label>
              </div>
              <div className="pay-qr-area">
                <div className="qr-placeholder">
                  <svg viewBox="0 0 120 120" width="120" height="120">
                    <rect width="120" height="120" rx="8" fill="#f5f5f5"/>
                    <text x="60" y="55" textAnchor="middle" fontSize="11" fill="#999">模拟二维码</text>
                    <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#bbb">扫码支付</text>
                  </svg>
                </div>
                <div className="pay-info">
                  <div className="pay-price">
                    实付 ¥<strong>{currentPlan?.actual_price || '—'}</strong>
                  </div>
                  <span className="pay-discount-tag">限时优惠</span>
                  <span className="pay-original">原价 ¥{currentPlan?.original_price || '—'}</span>
                  <label className="pay-agree">
                    <input type="checkbox" defaultChecked />
                    已阅读并同意《会员协议》
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="vip-activation-body">
            <div className="activation-form">
              <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                激活码激活后日期才开始生效，输入16位激活码即可开通会员
              </p>
              <label>激活码</label>
              <input
                placeholder="请输入16位激活码"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                maxLength={16}
              />
              {activateError && <p style={{ color: '#EF4444', fontSize: 13 }}>{activateError}</p>}
              {activateMsg && <p style={{ color: '#22C55E', fontSize: 13 }}>{activateMsg}</p>}
              <button
                className="btn-activate"
                disabled={activationCode.length < 16 || activateLoading}
                onClick={handleActivate}
              >
                {activateLoading ? '激活中...' : '立即激活'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default VipModal;

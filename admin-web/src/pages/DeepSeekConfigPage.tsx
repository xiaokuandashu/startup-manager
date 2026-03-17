import { useState, useEffect } from 'react';

interface DeepSeekConfigPageProps {
  token: string;
}

export default function DeepSeekConfigPage({ token }: DeepSeekConfigPageProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [dailyLimit, setDailyLimit] = useState('100');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [model, setModel] = useState('deepseek-chat');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/config/deepseek', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeyMasked(data.deepseek_api_key_masked || '');
        setDailyLimit(data.deepseek_daily_limit || '100');
        setBaseUrl(data.deepseek_base_url || 'https://api.deepseek.com');
        setModel(data.deepseek_model || 'deepseek-chat');
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const body: Record<string, string | number> = {
        deepseek_daily_limit: parseInt(dailyLimit) || 100,
        deepseek_base_url: baseUrl,
        deepseek_model: model,
      };
      if (apiKey) {
        body.deepseek_api_key = apiKey;
      }
      const res = await fetch('/api/admin/config/deepseek', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMsg('配置已保存 ✅');
        setMsgType('success');
        setApiKey('');
        loadConfig();
      } else {
        const data = await res.json();
        setMsg(data.error || '保存失败');
        setMsgType('error');
      }
    } catch {
      setMsg('保存失败，请检查网络');
      setMsgType('error');
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{
        background: 'var(--card-bg, #fff)',
        borderRadius: 12,
        padding: '28px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>DeepSeek API 配置</h3>
        <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 13 }}>
          配置全局 DeepSeek API 密钥，用于 AI 助手云端推理。用户也可在客户端配置自己的密钥。
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={apiKeyMasked ? `当前: ${apiKeyMasked}（留空则不更改）` : '请输入 sk-... 开头的密钥'}
            style={inputStyle}
          />
          {apiKeyMasked && (
            <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>
              ✅ 已配置密钥: {apiKeyMasked}
            </div>
          )}
          {!apiKeyMasked && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              ⚠️ 未配置密钥，用户将无法使用 DeepSeek 云端 AI
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>每日调用限额</label>
          <input
            type="number"
            value={dailyLimit}
            onChange={e => setDailyLimit(e.target.value)}
            placeholder="100"
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            每个用户每天可调用的最大次数（使用全局密钥时）
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>API Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.deepseek.com"
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            支持自定义代理地址，默认 https://api.deepseek.com
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>模型名称</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="deepseek-chat"
            style={inputStyle}
          />
        </div>

        {msg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            background: msgType === 'success' ? '#f0fdf4' : '#fef2f2',
            color: msgType === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${msgType === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {msg}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border 0.2s',
};

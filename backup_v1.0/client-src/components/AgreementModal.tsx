import React, { useState, useEffect } from 'react';
import { t, Language } from '../i18n';

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'user' | 'privacy';
  lang?: Language;
}

const API_BASE = 'https://bt.aacc.fun:8888';
const CACHE_KEY_PREFIX = 'agreement_cache_';
const CACHE_VERSION_KEY = 'agreement_cache_version';

// 从 localStorage 读取缓存
function getCachedAgreement(type: string, lang: string): { title: string; content: string } | null {
  try {
    const key = `${CACHE_KEY_PREFIX}${type}_${lang}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

// 写入缓存
function setCachedAgreement(type: string, lang: string, title: string, content: string) {
  try {
    const key = `${CACHE_KEY_PREFIX}${type}_${lang}`;
    localStorage.setItem(key, JSON.stringify({ title, content }));
  } catch { /* ignore */ }
}

// 获取当前缓存版本号
function getCachedVersion(): string {
  return localStorage.getItem(CACHE_VERSION_KEY) || '';
}

// 设置缓存版本号
function setCachedVersion(version: string) {
  localStorage.setItem(CACHE_VERSION_KEY, version);
}

const AgreementModal: React.FC<AgreementModalProps> = ({ isOpen, onClose, type, lang = 'zh' }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const isZh = lang === 'zh';
    const currentVersion = '0.2.8'; // 当前客户端版本号
    const cachedVersion = getCachedVersion();
    const cached = getCachedAgreement(type, lang);

    // 如果有本地缓存且版本一致，直接使用缓存
    if (cached && cachedVersion === currentVersion) {
      setTitle(cached.title);
      setContent(cached.content);
      setLoading(false);
      return;
    }

    // 版本更新或无缓存时，从服务器获取
    setLoading(true);
    fetch(`${API_BASE}/api/agreements/${type}`)
      .then(r => r.json())
      .then(data => {
        const newTitle = isZh ? data.title_zh : data.title_en;
        const newContent = isZh ? data.content_zh : data.content_en;
        setTitle(newTitle);
        setContent(newContent);
        // 保存到本地缓存
        setCachedAgreement(type, lang, newTitle, newContent);
        setCachedVersion(currentVersion);
      })
      .catch(() => {
        // 网络失败时尝试使用本地缓存（即使版本不一致也用）
        if (cached) {
          setTitle(cached.title);
          setContent(cached.content);
        } else {
          setTitle(type === 'user' ? t('userAgreement', lang) : t('privacyPolicy', lang));
          setContent(isZh ? '加载失败，请检查网络连接。' : 'Failed to load. Please check your network connection.');
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, type, lang]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content agreement-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title || (type === 'user' ? t('userAgreement', lang) : t('privacyPolicy', lang))}</h2>
          <button className="modal-close" onClick={onClose} style={{ marginLeft: 'auto' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="agreement-body" style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(80vh - 80px)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.8', color: 'var(--text-secondary, #666)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }}></div>
              Loading...
            </div>
          ) : content}
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;

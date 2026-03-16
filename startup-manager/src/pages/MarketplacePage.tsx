import React, { useState, useEffect } from 'react';
import { Language } from '../i18n';

interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  platform: string;
  step_count: number;
  duration_ms: number;
  downloads: number;
  rating: number;
  created_at: string;
}

interface MarketplacePageProps {
  lang?: Language;
}

const PLATFORM_ICONS: Record<string, string> = {
  macos: '🍎',
  windows: '🪟',
  cross: '🌐',
  linux: '🐧',
};

const CATEGORY_ICONS: Record<string, string> = {
  '全部': '📋',
  '办公效率': '💼',
  '开发工具': '🛠️',
  '社交通讯': '💬',
  '系统管理': '⚙️',
  '文件管理': '📁',
  '浏览器': '🌐',
  '设计创作': '🎨',
  '其他': '📦',
};

const formatDuration = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}秒` : `${Math.floor(s / 60)}分${s % 60}秒`;
};

const MarketplacePage: React.FC<MarketplacePageProps> = ({ lang: _lang = 'zh' }) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    loadItems();
  }, []);

  useEffect(() => {
    loadItems();
  }, [activeCategory, searchQuery]);

  const loadCategories = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const cats = await invoke<string[]>('marketplace_categories');
        setCategories(['全部', ...cats]);
      }
    } catch {
      setCategories(['全部', '办公效率', '开发工具', '社交通讯', '系统管理', '文件管理', '浏览器', '设计创作', '其他']);
    }
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const list = await invoke<MarketplaceItem[]>('marketplace_browse', {
          category: activeCategory === '全部' ? null : activeCategory,
          search: searchQuery || null,
        });
        setItems(list);
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  };

  const handleDownload = async (item: MarketplaceItem) => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('marketplace_download', { itemId: item.id });
        alert(`✅ "${item.name}" 已下载到录制列表！`);
      }
    } catch (e) {
      alert('下载失败：' + e);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
      <span className="mkt-stars">
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
        <span className="mkt-rating-num">{rating.toFixed(1)}</span>
      </span>
    );
  };

  return (
    <div className="mkt-page">
      {/* 顶部搜索栏 */}
      <div className="mkt-header">
        <div className="mkt-header-left">
          <h3>🏪 任务市场</h3>
          <span className="mkt-subtitle">发现和分享自动化任务</span>
        </div>
        <div className="mkt-search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 分类标签 */}
      <div className="mkt-categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`mkt-cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {CATEGORY_ICONS[cat] || '📦'} {cat}
          </button>
        ))}
      </div>

      {/* 任务卡片网格 */}
      <div className="mkt-grid">
        {isLoading ? (
          <div className="mkt-loading">加载中...</div>
        ) : items.length === 0 ? (
          <div className="mkt-empty">
            <div className="mkt-empty-icon">🔍</div>
            <div className="mkt-empty-text">未找到匹配的任务</div>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="mkt-card">
              <div className="mkt-card-top">
                <span className="mkt-card-platform">{PLATFORM_ICONS[item.platform] || '🌐'}</span>
                <span className="mkt-card-category">{item.category}</span>
              </div>
              <div className="mkt-card-name">{item.name}</div>
              <div className="mkt-card-desc">{item.description}</div>
              <div className="mkt-card-tags">
                {item.tags.map((tag, i) => (
                  <span key={i} className="mkt-tag">#{tag}</span>
                ))}
              </div>
              <div className="mkt-card-meta">
                <span>👤 {item.author}</span>
                <span>📝 {item.step_count}步</span>
                <span>🕐 {formatDuration(item.duration_ms)}</span>
              </div>
              <div className="mkt-card-footer">
                <div className="mkt-card-stats">
                  {renderStars(item.rating)}
                  <span className="mkt-downloads">⬇ {item.downloads}</span>
                </div>
                <button className="mkt-btn-download" onClick={() => handleDownload(item)}>
                  📥 获取
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;

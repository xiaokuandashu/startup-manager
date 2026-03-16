import React, { useState, useEffect } from 'react';
import { Language } from '../i18n';

const API_BASE = 'https://bt.aacc.fun:8888/api';

interface MarketTask {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  cost_credits: number;
  safety_level: string;
  rating: number;
  rating_count: number;
  download_count: number;
  publisher: string;
  created_at: string;
  user_id: string;
}

interface TaskDetail extends MarketTask {
  task_config: string;
  recording_data: string;
  comments: Comment[];
  audit: any;
}

interface Comment {
  id: number;
  content: string;
  rating: number;
  user_email: string;
  created_at: string;
}

interface MarketplacePageProps {
  lang?: Language;
}

const CATEGORIES = ['全部', '通用', '办公效率', '开发工具', '社交通讯', '系统管理', '文件管理', '其他'];
const CATEGORY_ICONS: Record<string, string> = {
  '全部': '📋', '通用': '🌐', '办公效率': '💼', '开发工具': '🛠️',
  '社交通讯': '💬', '系统管理': '⚙️', '文件管理': '📁', '其他': '📦',
};
const SAFETY_ICONS: Record<string, string> = {
  safe: '🟢', review: '🟡', dangerous: '🔴',
};
const SAFETY_LABELS: Record<string, string> = {
  safe: '安全', review: '待审', dangerous: '危险',
};

const MarketplacePage: React.FC<MarketplacePageProps> = ({ lang: _lang = 'zh' }) => {
  const [items, setItems] = useState<MarketTask[]>([]);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 积分
  const [credits, setCredits] = useState(0);

  // 详情
  const [detailTask, setDetailTask] = useState<TaskDetail | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);

  // 发布
  const [showPublish, setShowPublish] = useState(false);
  const [pubName, setPubName] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubCategory, setPubCategory] = useState('通用');
  const [pubTags, setPubTags] = useState('');

  // 我的发布
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  const userId = localStorage.getItem('user_id') || '';
  const token = localStorage.getItem('auth_token') || '';

  useEffect(() => { loadItems(); loadCredits(); }, [activeCategory, searchQuery, sortBy, page]);

  const loadCredits = async () => {
    if (!userId || !token) return;
    try {
      const resp = await fetch(`${API_BASE}/credits/balance/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setCredits(data.balance || 0);
    } catch { /* ignore */ }
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (activeCategory !== '全部') params.set('category', activeCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy === 'downloads') params.set('sort', 'downloads');
      if (sortBy === 'rating') params.set('sort', 'rating');

      const resp = await fetch(`${API_BASE}/marketplace/list?${params}`);
      const data = await resp.json();
      setItems(data.tasks || []);
      setTotal(data.total || 0);
    } catch { setItems([]); }
    setIsLoading(false);
  };

  const loadDetail = async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE}/marketplace/detail/${id}`);
      const data = await resp.json();
      setDetailTask(data);
    } catch { /* ignore */ }
  };

  const handleDownload = async (taskId: string, taskName: string) => {
    if (!userId || !token) { alert('请先登录'); return; }
    try {
      const resp = await fetch(`${API_BASE}/marketplace/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, taskId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || '下载失败');
        return;
      }
      // 保存到本地录制
      if (data.recordingData && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const recording = JSON.parse(data.recordingData);
          await invoke('recording_save', {
            name: `[市场] ${taskName}`,
            steps: recording.steps || [],
            durationMs: recording.duration_ms || 0,
          });
        } catch { /* ignore */ }
      }
      // 保存到本地任务
      if (data.taskConfig) {
        try {
          const config = JSON.parse(data.taskConfig);
          const tasks = JSON.parse(localStorage.getItem('startup_tasks') || '[]');
          tasks.push({ ...config, id: Date.now().toString(), name: `[市场] ${taskName}` });
          localStorage.setItem('startup_tasks', JSON.stringify(tasks));
        } catch { /* ignore */ }
      }
      alert(`✅ "${taskName}" 已下载成功！`);
      loadCredits();
      if (detailTask) loadDetail(detailTask.id);
    } catch (e) { alert('下载失败：' + e); }
  };

  const handleComment = async () => {
    if (!detailTask || !commentText.trim() || !userId) return;
    try {
      await fetch(`${API_BASE}/marketplace/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, taskId: detailTask.id, content: commentText.trim(), rating: commentRating }),
      });
      setCommentText('');
      setCommentRating(5);
      loadDetail(detailTask.id);
    } catch { /* ignore */ }
  };

  const handlePublish = async () => {
    if (!pubName.trim() || !userId) return;
    try {
      // 获取本地录制列表作为发布内容
      let recordingData = null;
      let taskConfig = null;
      if ((window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const recordings = await invoke<any[]>('recording_list');
        if (recordings.length > 0) {
          recordingData = JSON.stringify(recordings[0]); // 发布最新录制
        }
      }
      const tasks = JSON.parse(localStorage.getItem('startup_tasks') || '[]');
      if (tasks.length > 0) {
        taskConfig = JSON.stringify(tasks[0]); // 发布最新任务
      }

      const resp = await fetch(`${API_BASE}/marketplace/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId, name: pubName.trim(), description: pubDesc,
          category: pubCategory, tags: pubTags.split(',').map(t => t.trim()).filter(Boolean),
          recordingData, taskConfig,
        }),
      });
      const data = await resp.json();
      if (data.status === 'rejected') {
        alert(`❌ 任务被自动审查拒绝：\n${data.risks?.join('\n') || '安全风险'}`);
      } else if (data.status === 'pending') {
        alert(`⏳ 任务已提交，等待人工审核\n风险提示：${data.risks?.join(', ') || '无'}`);
      } else {
        alert('✅ 任务已发布并通过审核！获得 1 积分');
        loadCredits();
      }
      setShowPublish(false);
      setPubName(''); setPubDesc(''); setPubTags('');
      loadItems();
    } catch (e) { alert('发布失败：' + e); }
  };

  const loadMyTasks = async () => {
    if (!userId) return;
    try {
      const resp = await fetch(`${API_BASE}/marketplace/my/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTasks(await resp.json());
      setShowMyTasks(true);
    } catch { /* ignore */ }
  };

  const renderStars = (n: number) => '★'.repeat(Math.floor(n)) + '☆'.repeat(5 - Math.floor(n));

  // ========== 详情视图 ==========
  if (detailTask) {
    return (
      <div className="mkt-page">
        <div className="mkt-header">
          <button className="mkt-back-btn" onClick={() => setDetailTask(null)}>← 返回</button>
          <h3>{detailTask.name}</h3>
        </div>
        <div className="mkt-detail">
          <div className="mkt-detail-main">
            <div className="mkt-detail-info">
              <span>{SAFETY_ICONS[detailTask.safety_level]} {SAFETY_LABELS[detailTask.safety_level]}</span>
              <span>📁 {detailTask.category}</span>
              <span>⬇ {detailTask.download_count} 下载</span>
              <span>⭐ {detailTask.rating.toFixed(1)} ({detailTask.rating_count}评)</span>
              <span>👤 {detailTask.publisher}</span>
            </div>
            <p className="mkt-detail-desc">{detailTask.description || '暂无描述'}</p>
            <div className="mkt-detail-tags">
              {detailTask.tags.map((t, i) => <span key={i} className="mkt-tag">#{t}</span>)}
            </div>
            <button className="mkt-btn-download mkt-btn-big" onClick={() => handleDownload(detailTask.id, detailTask.name)}>
              📥 下载（{detailTask.cost_credits} 积分）
            </button>
          </div>

          {/* 评论区 */}
          <div className="mkt-comments">
            <h4>💬 评论 ({detailTask.comments?.length || 0})</h4>
            {userId && (
              <div className="mkt-comment-form">
                <div className="mkt-comment-rating">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`mkt-star ${n <= commentRating ? 'active' : ''}`} onClick={() => setCommentRating(n)}>★</span>
                  ))}
                </div>
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="写评论..." className="mkt-comment-input" />
                <button className="mkt-comment-btn" onClick={handleComment} disabled={!commentText.trim()}>发送</button>
              </div>
            )}
            {detailTask.comments?.map(c => (
              <div key={c.id} className="mkt-comment-item">
                <div className="mkt-comment-header">
                  <span>👤 {c.user_email?.split('@')[0] || '匿名'}</span>
                  <span className="mkt-comment-stars">{renderStars(c.rating)}</span>
                  <span className="mkt-comment-date">{c.created_at?.slice(0, 10)}</span>
                </div>
                <div className="mkt-comment-content">{c.content}</div>
              </div>
            ))}
            {(!detailTask.comments || detailTask.comments.length === 0) && (
              <div className="mkt-empty-text">暂无评论</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== 我的发布 ==========
  if (showMyTasks) {
    return (
      <div className="mkt-page">
        <div className="mkt-header">
          <button className="mkt-back-btn" onClick={() => setShowMyTasks(false)}>← 返回</button>
          <h3>📋 我的发布</h3>
        </div>
        <div className="mkt-my-list">
          {myTasks.length === 0 ? (
            <div className="mkt-empty"><div className="mkt-empty-icon">📭</div><div className="mkt-empty-text">暂无发布</div></div>
          ) : myTasks.map(t => (
            <div key={t.id} className="mkt-my-item">
              <div className="mkt-my-name">{t.name}</div>
              <div className="mkt-my-meta">
                <span className={`mkt-status mkt-status-${t.status}`}>{
                  t.status === 'approved' ? '✅ 已通过' : t.status === 'pending' ? '⏳ 审核中' : `❌ 已拒绝${t.reject_reason ? ': ' + t.reject_reason : ''}`
                }</span>
                <span>⬇ {t.download_count}</span>
                <span>⭐ {t.rating?.toFixed(1) || '0'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== 发布对话框 ==========
  const publishDialog = showPublish && (
    <div className="mkt-publish-overlay" onClick={() => setShowPublish(false)}>
      <div className="mkt-publish-dialog" onClick={e => e.stopPropagation()}>
        <h4>📤 发布任务到市场</h4>
        <label>任务名称 *</label>
        <input value={pubName} onChange={e => setPubName(e.target.value)} placeholder="例：每日自动打卡" />
        <label>描述</label>
        <textarea value={pubDesc} onChange={e => setPubDesc(e.target.value)} placeholder="描述你的任务..." rows={3} />
        <label>分类</label>
        <select value={pubCategory} onChange={e => setPubCategory(e.target.value)}>
          {CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label>标签（逗号分隔）</label>
        <input value={pubTags} onChange={e => setPubTags(e.target.value)} placeholder="打卡,微信,自动化" />
        <p className="mkt-publish-note">📌 将自动提交最新的录制和任务配置，通过安全审核后发布</p>
        <div className="mkt-publish-actions">
          <button className="mkt-btn-cancel" onClick={() => setShowPublish(false)}>取消</button>
          <button className="mkt-btn-publish" onClick={handlePublish} disabled={!pubName.trim()}>发布</button>
        </div>
      </div>
    </div>
  );

  // ========== 主视图 ==========
  return (
    <div className="mkt-page">
      {publishDialog}

      <div className="mkt-header">
        <div className="mkt-header-left">
          <h3>🏪 任务市场</h3>
          <span className="mkt-subtitle">发现和分享自动化任务</span>
        </div>
        <div className="mkt-header-right">
          {userId && <span className="mkt-credits" title="我的积分">💰 {credits} 积分</span>}
          <button className="mkt-btn-my" onClick={loadMyTasks}>📋 我的发布</button>
          <button className="mkt-btn-pub" onClick={() => setShowPublish(true)}>📤 发布</button>
        </div>
      </div>

      <div className="mkt-toolbar">
        <div className="mkt-categories">
          {CATEGORIES.map(cat => (
            <button key={cat} className={`mkt-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => { setActiveCategory(cat); setPage(1); }}>
              {CATEGORY_ICONS[cat] || '📦'} {cat}
            </button>
          ))}
        </div>
        <div className="mkt-sort-search">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="mkt-sort-select">
            <option value="latest">最新</option>
            <option value="downloads">最多下载</option>
            <option value="rating">最高评分</option>
          </select>
          <div className="mkt-search-box">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="mkt-grid">
        {isLoading ? (
          <div className="mkt-loading">加载中...</div>
        ) : items.length === 0 ? (
          <div className="mkt-empty">
            <div className="mkt-empty-icon">🔍</div>
            <div className="mkt-empty-text">暂无任务{searchQuery ? '，换个关键词试试' : '，成为第一个发布者！'}</div>
          </div>
        ) : items.map(item => (
          <div key={item.id} className="mkt-card" onClick={() => loadDetail(item.id)}>
            <div className="mkt-card-top">
              <span className="mkt-card-safety">{SAFETY_ICONS[item.safety_level]}</span>
              <span className="mkt-card-category">{item.category}</span>
              <span className="mkt-card-cost">💰 {item.cost_credits}</span>
            </div>
            <div className="mkt-card-name">{item.name}</div>
            <div className="mkt-card-desc">{item.description || '暂无描述'}</div>
            <div className="mkt-card-tags">
              {item.tags?.map((tag, i) => <span key={i} className="mkt-tag">#{tag}</span>)}
            </div>
            <div className="mkt-card-footer">
              <div className="mkt-card-stats">
                <span>⭐ {item.rating.toFixed(1)}</span>
                <span>⬇ {item.download_count}</span>
                <span>👤 {item.publisher?.split('@')[0]}</span>
              </div>
              <button className="mkt-btn-download" onClick={e => { e.stopPropagation(); handleDownload(item.id, item.name); }}>
                📥 获取
              </button>
            </div>
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="mkt-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← 上一页</button>
          <span>{page}/{Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>下一页 →</button>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;

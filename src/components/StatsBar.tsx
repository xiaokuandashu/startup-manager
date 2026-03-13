import React, { useState } from 'react';

interface StatsBarProps {
  totalTasks: number;
  runningTasks: number;
  failedTasks: number;
  todaySuccess: number;
  todayFailed: number;
  onAddTask: () => void;
  onImportTask: () => void;
}

const StatsBar: React.FC<StatsBarProps> = ({
  totalTasks,
  runningTasks,
  failedTasks,
  todaySuccess,
  todayFailed,
  onAddTask,
  onImportTask,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const statsItems = [
    { label: '全部任务', count: totalTasks },
    { label: '任务中', count: runningTasks },
    { label: '任务失败', count: failedTasks },
    { label: '今日执行成功', count: todaySuccess },
    { label: '今日执行失败', count: todayFailed },
  ];

  return (
    <div className={`stats-bar ${collapsed ? 'collapsed' : ''}`}>
      {!collapsed ? (
        <>
          <div className="stats-bar-content">
            <div className="stats-actions">
              <button className="action-btn" onClick={onAddTask}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>
                <span>添加</span>
              </button>
              <button className="action-btn" onClick={onImportTask}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <path d="M12 8v8M8 14l4 4 4-4"/>
                </svg>
                <span>导入</span>
              </button>
            </div>
            <div className="stats-cards">
              {statsItems.map((item, index) => (
                <div key={index} className="stats-card">
                  <div className="stats-card-icon">
                    <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
                      <rect x="4" y="4" width="14" height="14" rx="3" fill="#4FC3F7"/>
                      <rect x="22" y="4" width="14" height="14" rx="3" fill="#81D4FA"/>
                      <rect x="4" y="22" width="14" height="14" rx="3" fill="#29B6F6"/>
                      {index === 1 && <circle cx="30" cy="30" r="8" fill="#FF9800" stroke="#fff" strokeWidth="2"/>}
                      {index === 2 && <><circle cx="30" cy="30" r="8" fill="#F44336" stroke="#fff" strokeWidth="2"/><path d="M27 27l6 6M33 27l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></>}
                      {index === 3 && <><circle cx="30" cy="12" r="8" fill="#4CAF50" stroke="#fff" strokeWidth="2"/><path d="M27 12l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>}
                      {index === 4 && <><circle cx="30" cy="12" r="8" fill="#F44336" stroke="#fff" strokeWidth="2"/><path d="M27 9l6 6M33 9l-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></>}
                    </svg>
                  </div>
                  <div className="stats-card-info">
                    <span className="stats-card-count">{item.count}</span>
                    <span className="stats-card-label">{item.label}</span>
                  </div>
                  {index < statsItems.length - 1 && <div className="stats-divider" />}
                </div>
              ))}
            </div>
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(true)} title="折叠">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      ) : (
        <div className="stats-bar-collapsed">
          <div className="collapsed-actions">
            <button className="collapsed-action-btn" onClick={onAddTask}>添加</button>
            <button className="collapsed-action-btn" onClick={onImportTask}>导入</button>
          </div>
          <div className="collapsed-stats">
            {statsItems.map((item, index) => (
              <span key={index} className="collapsed-stat-item">
                {item.label} <strong>{item.count}</strong>
              </span>
            ))}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(false)} title="展开">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default StatsBar;

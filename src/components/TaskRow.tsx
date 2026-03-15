import React, { useState, useRef } from 'react';
import { StartupTask } from '../types';
import Toggle from './Toggle';
import MoreDropdown from './MoreDropdown';

interface TaskRowProps {
  task: StartupTask;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const extColorMap: Record<string, string> = {
  '.app': '#42A5F5',
  '.bat': '#FF9800',
  '.exe': '#8BC34A',
  '.sh': '#FF9800',
};

const TaskRow: React.FC<TaskRowProps> = ({
  task, onToggle, onEdit, onCopy, onDelete, onExport,
  isSelectMode, isSelected, onSelect,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  const ext = task.fileExt || '.app';
  const bgColor = extColorMap[ext] || '#42A5F5';
  const hasRealIcon = task.icon && task.icon.startsWith('data:image');

  // 执行状态文字
  const statusText = task.statusText || '等待执行';
  const isError = statusText.includes('失败');
  const isSuccess = statusText.includes('成功');

  return (
    <div className={`task-row ${isSelected ? 'selected' : ''}`}>
      {/* 图标列（独立列，无表头文字） */}
      <div className="task-cell task-icon-cell">
        {hasRealIcon ? (
          <img src={task.icon} alt={task.name} className="task-real-icon" />
        ) : (
          <span className="file-ext-badge" style={{ backgroundColor: bgColor }}>{ext}</span>
        )}
      </div>
      {/* 任务名称（与表头"任务名称"对齐） */}
      <div className="task-cell task-name-cell" title={task.name}>{task.name}</div>
      {/* 任务类型 */}
      <div className="task-cell" title={task.taskType}>{task.taskType}</div>
      {/* 时间类型 */}
      <div className="task-cell" title={task.timeType}>{task.timeType}</div>
      {/* 执行时间 */}
      <div className="task-cell task-time-cell" title={task.executeTime}>{task.executeTime}</div>
      {/* 距离任务开始 */}
      <div className="task-cell task-countdown-cell" title={task.timeUntilExec}>{task.timeUntilExec}</div>
      {/* 路径地址 */}
      <div className="task-cell task-path-cell" title={task.path}>{task.path || '— —'}</div>
      {/* 备注 */}
      <div className="task-cell task-note-cell" title={task.note}>{task.note || '—'}</div>
      {/* 执行状态 */}
      <div className="task-cell task-status-cell">
        <span className={`status-tag ${isError ? 'error' : isSuccess ? 'success' : 'pending'}`}>
          {statusText}
        </span>
      </div>
      {/* 开关 */}
      <div className="task-cell task-toggle-cell">
        <Toggle checked={task.enabled} onChange={() => onToggle(task.id)} />
      </div>
      {/* 操作 */}
      <div className="task-cell task-actions-cell">
        <button className="action-link" onClick={() => onEdit(task.id)}>编辑</button>
        <button className="action-link" onClick={() => onCopy(task.id)}>复制</button>
        <div className="more-wrapper">
          <button
            className="action-link more-btn"
            ref={moreRef}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoreOpen(!moreOpen); }}
          >···</button>
          {moreOpen && (
            <MoreDropdown
              isOpen={moreOpen}
              onClose={() => setMoreOpen(false)}
              onExport={() => { onExport(task.id); setMoreOpen(false); }}
              onDelete={() => { onDelete(task.id); setMoreOpen(false); }}
            />
          )}
        </div>
      </div>
      {isSelectMode && (
        <div className="task-cell task-checkbox-cell">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(task.id)}
            className="row-checkbox"
          />
        </div>
      )}
    </div>
  );
};

export default TaskRow;

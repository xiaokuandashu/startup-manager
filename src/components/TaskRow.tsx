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

  // 使用真实应用图标（如果有 Base64 icon），否则使用文件扩展名徽标
  const hasRealIcon = task.icon && task.icon.startsWith('data:image');

  return (
    <div className={`task-row ${isSelected ? 'selected' : ''}`}>
      <div className="task-cell task-name-cell">
        {hasRealIcon ? (
          <img src={task.icon} alt={task.name} className="task-real-icon" />
        ) : (
          <span className="file-ext-badge" style={{ backgroundColor: bgColor }}>{ext}</span>
        )}
        <span className="task-name-text" title={task.name}>{task.name}</span>
      </div>
      <div className="task-cell" title={task.taskType}>{task.taskType}</div>
      <div className="task-cell" title={task.timeType}>{task.timeType}</div>
      <div className="task-cell task-time-cell" title={task.executeTime}>{task.executeTime}</div>
      <div className="task-cell task-countdown-cell" title={task.timeUntilExec}>{task.timeUntilExec}</div>
      <div className="task-cell task-path-cell" title={task.path}>{task.path || '— —'}</div>
      <div className="task-cell task-note-cell">
        <span title={task.note}>{task.note}</span>
        {task.statusText && (
          <span className={`status-tag ${task.statusText.includes('失败') ? 'error' : 'success'}`}>
            {task.statusText}
          </span>
        )}
      </div>
      <div className="task-cell">
        <Toggle checked={task.enabled} onChange={() => onToggle(task.id)} />
      </div>
      <div className="task-cell task-actions-cell">
        <button className="action-link" onClick={() => onEdit(task.id)}>编辑</button>
        <button className="action-link" onClick={() => onCopy(task.id)}>复制</button>
        <div className="more-wrapper" style={{ position: 'relative' }}>
          <button
            className="action-link more-btn"
            ref={moreRef}
            onClick={(e) => { e.stopPropagation(); setMoreOpen(!moreOpen); }}
          >···</button>
          <MoreDropdown
            isOpen={moreOpen}
            onClose={() => setMoreOpen(false)}
            onExport={() => onExport(task.id)}
            onDelete={() => onDelete(task.id)}
          />
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

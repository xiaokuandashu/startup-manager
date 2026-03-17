import React, { useState, useRef } from 'react';
import { StartupTask } from '../types';
import Toggle from './Toggle';
import MoreDropdown from './MoreDropdown';
import { t, Language } from '../i18n';

interface TaskRowProps {
  task: StartupTask;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onUpdateRecording?: (id: string, recordingId?: string, recordingName?: string) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  lang?: Language;
}

const extColorMap: Record<string, string> = {
  '.app': '#42A5F5',
  '.bat': '#FF9800',
  '.exe': '#8BC34A',
  '.sh': '#FF9800',
};

const TaskRow: React.FC<TaskRowProps> = ({
  task, onToggle, onEdit, onCopy, onDelete, onExport, onUpdateRecording,
  isSelectMode, isSelected, onSelect, lang = 'zh',
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [showRecPicker, setShowRecPicker] = useState(false);
  const [recList, setRecList] = useState<{name:string}[]>([]);

  const ext = task.fileExt || '.app';
  const bgColor = extColorMap[ext] || '#42A5F5';
  const hasRealIcon = task.icon && task.icon.startsWith('data:image');

  // 执行状态文字
  const statusText = task.statusText || t('waitingExec', lang);
  const isError = statusText.includes('失败') || statusText.includes('fail') || statusText.includes('Failed');
  const isSuccess = statusText.includes('成功') || statusText.includes('success') || statusText.includes('Success');

  return (
    <div className={`task-row ${isSelected ? 'selected' : ''}`}>
      {/* 图标列 */}
      <div className="task-cell task-icon-cell">
        {hasRealIcon ? (
          <img src={task.icon} alt={task.name} className="task-real-icon" />
        ) : (
          <span className="file-ext-badge" style={{ backgroundColor: bgColor }}>{ext}</span>
        )}
      </div>
      {/* 任务名称 + 录制绑定 */}
      <div className="task-cell task-name-cell" title={task.name}>
        <span>{task.name}</span>
        <span className="task-rec-area">
          {task.recordingId ? (
            <>
              <span
                className="task-rec-badge clickable"
                title="点击更换录制"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const { invoke } = await import('@tauri-apps/api/core');
                    const list = await invoke<{name:string}[]>('recording_list');
                    setRecList(list || []);
                  } catch { setRecList([]); }
                  setShowRecPicker(!showRecPicker);
                }}
              >
                🎬 {task.recordingName || task.recordingId}
              </span>
              <span
                className="task-rec-unbind"
                title="解除绑定"
                onClick={(e) => { e.stopPropagation(); onUpdateRecording?.(task.id, undefined, undefined); }}
              >✕</span>
            </>
          ) : (
            <span
              className="task-rec-add"
              title="关联录制"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  const list = await invoke<{name:string}[]>('recording_list');
                  setRecList(list || []);
                } catch { setRecList([]); }
                setShowRecPicker(!showRecPicker);
              }}
            >+ 录制</span>
          )}
          {showRecPicker && (
            <div className="rec-picker-dropdown">
              {recList.length === 0 ? (
                <div className="rec-picker-empty">没有录制</div>
              ) : recList.map(r => (
                <div
                  key={r.name}
                  className="rec-picker-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateRecording?.(task.id, r.name, r.name);
                    setShowRecPicker(false);
                  }}
                >{r.name}</div>
              ))}
            </div>
          )}
        </span>
      </div>
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
        <button className="action-link" onClick={() => onEdit(task.id)}>{t('edit', lang)}</button>
        <button className="action-link" onClick={() => onCopy(task.id)}>{t('copy', lang)}</button>
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
              lang={lang}
            />
          )}
        </div>
      </div>
      {/* 多选 - 始终渲染以保持12列Grid对齐 */}
      <div className="task-cell task-checkbox-cell">
        {isSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(task.id)}
            className="row-checkbox"
          />
        )}
      </div>
    </div>
  );
};

export default TaskRow;

import React, { useState, useRef, useEffect } from 'react';
import { StartupTask } from '../types';
import TaskRow from './TaskRow';
import { t, Language } from '../i18n';

interface TaskTableProps {
  tasks: StartupTask[];
  filteredTasks: StartupTask[];
  selectedTasks: string[];
  isSelectMode: boolean;
  onToggleSelect: () => void;
  onToggleSelectAll: () => void;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onUpdateRecording?: (id: string, recordingId?: string, recordingName?: string) => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  lang?: Language;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  filteredTasks,
  selectedTasks,
  isSelectMode,
  onToggleSelect,
  onToggleSelectAll: _onToggleSelectAll,
  onSelect,
  onToggle,
  onEdit,
  onCopy,
  onDelete,
  onExport,
  onUpdateRecording,
  onBatchDelete,
  onBatchExport,
  lang = 'zh',
}) => {
  const [filterTaskType, setFilterTaskType] = useState<string>('');
  const [filterCycleType, setFilterCycleType] = useState<string>('');
  const [showTaskTypeFilter, setShowTaskTypeFilter] = useState(false);
  const [showCycleTypeFilter, setShowCycleTypeFilter] = useState(false);
  const taskTypeRef = useRef<HTMLDivElement>(null);
  const cycleTypeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (taskTypeRef.current && !taskTypeRef.current.contains(e.target as Node)) setShowTaskTypeFilter(false);
      if (cycleTypeRef.current && !cycleTypeRef.current.contains(e.target as Node)) setShowCycleTypeFilter(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Get unique types for filter options
  const allLabel = t('filterAll', lang);
  const taskTypes = Array.from(new Set(filteredTasks.map(t => t.taskType).filter(Boolean)));
  const cycleTypes = Array.from(new Set(filteredTasks.map(t => t.timeType).filter(Boolean)));

  // Apply filters
  let displayTasks = filteredTasks;
  if (filterTaskType) displayTasks = displayTasks.filter(t => t.taskType === filterTaskType);
  if (filterCycleType) displayTasks = displayTasks.filter(t => t.timeType === filterCycleType);

  return (
    <div className="task-table-container">
      <div className="task-table">
        <div className="task-table-header">
          <div className="task-cell"></div>
          <div className="task-cell task-name-cell">{t('taskName', lang)}</div>
          {/* Task Type Filter */}
          <div className="task-cell filter-cell" ref={taskTypeRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowTaskTypeFilter(!showTaskTypeFilter)}>
            {t('taskType', lang)} <span className="filter-arrow">▾</span>
            {showTaskTypeFilter && (
              <div className="filter-dropdown">
                <div className={`filter-option ${!filterTaskType ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setFilterTaskType(''); setShowTaskTypeFilter(false); }}>{allLabel}</div>
                {taskTypes.map(type => (
                  <div key={type} className={`filter-option ${filterTaskType === type ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setFilterTaskType(type); setShowTaskTypeFilter(false); }}>{type}</div>
                ))}
              </div>
            )}
          </div>
          {/* Cycle Type Filter */}
          <div className="task-cell filter-cell" ref={cycleTypeRef} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowCycleTypeFilter(!showCycleTypeFilter)}>
            {t('cycleType', lang)} <span className="filter-arrow">▾</span>
            {showCycleTypeFilter && (
              <div className="filter-dropdown">
                <div className={`filter-option ${!filterCycleType ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setFilterCycleType(''); setShowCycleTypeFilter(false); }}>{allLabel}</div>
                {cycleTypes.map(type => (
                  <div key={type} className={`filter-option ${filterCycleType === type ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setFilterCycleType(type); setShowCycleTypeFilter(false); }}>{type}</div>
                ))}
              </div>
            )}
          </div>
          <div className="task-cell">{t('executionTime', lang)}</div>
          <div className="task-cell">{t('nextRun', lang)}</div>
          <div className="task-cell">{t('selectPath', lang)}</div>
          <div className="task-cell">{t('noteLabel', lang)}</div>
          <div className="task-cell" style={{ textAlign: 'right' }}>{t('status', lang)}</div>
          <div className="task-cell" style={{ textAlign: 'right' }}>{t('enable', lang)}</div>
          <div className="task-cell" style={{ textAlign: 'right' }}>{t('actions', lang)}</div>
          <div className="task-cell task-checkbox-cell">
            <input
              type="checkbox"
              checked={isSelectMode}
              onChange={onToggleSelect}
              className="header-checkbox"
              title={t('selectAll', lang)}
            />
          </div>
        </div>

        <div className="task-table-body">
          {displayTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration" style={{ position: 'relative', display: 'inline-block' }}>
                <img src="/icon/picture_nonoe.svg" alt="empty" width="200" height="200" style={{ opacity: 0.8 }} />
                <p className="empty-text" style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{t('noTasks', lang)}，{t('noTasksHint', lang)}</p>
              </div>
            </div>
          ) : (
            displayTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={onToggle}
                onEdit={onEdit}
                onCopy={onCopy}
                onDelete={onDelete}
                onExport={onExport}
                onUpdateRecording={onUpdateRecording}
                isSelectMode={isSelectMode}
                isSelected={selectedTasks.includes(task.id)}
                onSelect={onSelect}
                lang={lang}
              />
            ))
          )}
        </div>
      </div>

      {isSelectMode && selectedTasks.length > 0 && (
        <div className="batch-action-bar">
          <span className="batch-info">{t('totalTasks', lang)} {tasks.length}，{t('selectAll', lang)} {selectedTasks.length}</span>
          <div className="batch-buttons">
            <button className="btn-batch-export" onClick={onBatchExport}>{t('batchExport', lang)}</button>
            <button className="btn-batch-delete" onClick={onBatchDelete}>{t('batchDelete', lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTable;

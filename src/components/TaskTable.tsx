import React from 'react';
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
  onBatchDelete,
  onBatchExport,
  lang = 'zh',
}) => {
  return (
    <div className="task-table-container">
      <div className="task-table">
        <div className="task-table-header">
          <div className="task-cell"></div>
          <div className="task-cell task-name-cell">{t('taskName', lang)}</div>
          <div className="task-cell filter-cell">{t('taskType', lang)} <span className="filter-arrow">▾</span></div>
          <div className="task-cell filter-cell">{t('cycleType', lang)} <span className="filter-arrow">▾</span></div>
          <div className="task-cell">{t('executionTime', lang)}</div>
          <div className="task-cell">{t('nextRun', lang)}</div>
          <div className="task-cell">{t('selectPath', lang)}</div>
          <div className="task-cell">{t('noteLabel', lang)}</div>
          <div className="task-cell">{t('status', lang)}</div>
          <div className="task-cell">{t('enable', lang)}</div>
          <div className="task-cell">{t('actions', lang)}</div>
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
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <img src="/icon/icon_line_smile.svg" alt="empty" width="120" height="120" style={{ opacity: 0.6 }} />
              </div>
              <p className="empty-text">{t('noTasks', lang)}，{t('noTasksHint', lang)}</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={onToggle}
                onEdit={onEdit}
                onCopy={onCopy}
                onDelete={onDelete}
                onExport={onExport}
                isSelectMode={isSelectMode}
                isSelected={selectedTasks.includes(task.id)}
                onSelect={onSelect}
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

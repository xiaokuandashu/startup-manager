import React from 'react';
import { StartupTask } from '../types';
import TaskRow from './TaskRow';

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
}) => {
  return (
    <div className="task-table-container">
      <div className="task-table">
        <div className="task-table-header">
          <div className="task-cell task-name-cell">任务名称</div>
          <div className="task-cell filter-cell">任务类型 <span className="filter-arrow">▾</span></div>
          <div className="task-cell filter-cell">时间类型 <span className="filter-arrow">▾</span></div>
          <div className="task-cell">执行时间</div>
          <div className="task-cell">距离任务开始</div>
          <div className="task-cell">路径地址</div>
          <div className="task-cell">备注</div>
          <div className="task-cell">开关</div>
          <div className="task-cell">操作</div>
          <div className="task-cell task-checkbox-cell">
            <input
              type="checkbox"
              checked={isSelectMode}
              onChange={onToggleSelect}
              className="header-checkbox"
              title="批量选择"
            />
          </div>
        </div>

        <div className="task-table-body">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <img src="/icon/icon_line_smile.svg" alt="empty" width="120" height="120" style={{ opacity: 0.6 }} />
              </div>
              <p className="empty-text">暂无历史记录，快去新建吧～～</p>
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
          <span className="batch-info">全部共{tasks.length}项，已选择{selectedTasks.length}项</span>
          <div className="batch-buttons">
            <button className="btn-batch-export" onClick={onBatchExport}>批量导出配置</button>
            <button className="btn-batch-delete" onClick={onBatchDelete}>批量删除</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTable;

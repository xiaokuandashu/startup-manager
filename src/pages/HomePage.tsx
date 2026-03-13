import React, { useState } from 'react';
import { StartupTask } from '../types';
import { mockTasks } from '../mockData';
import StatsBar from '../components/StatsBar';
import TaskTable from '../components/TaskTable';
import AddTaskModal from '../components/AddTaskModal';

interface HomePageProps {
  searchQuery: string;
  checkVipBeforeAdd: () => boolean;
}

const HomePage: React.FC<HomePageProps> = ({ searchQuery, checkVipBeforeAdd }) => {
  const [tasks, setTasks] = useState<StartupTask[]>(mockTasks);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredTasks = searchQuery
    ? tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.enabled).length,
    failed: tasks.filter(t => t.status === 'error').length,
    todaySuccess: tasks.filter(t => t.statusText === '今日执行成功').length,
    todayFailed: tasks.filter(t => t.statusText === '今日执行失败').length,
  };

  const handleAddClick = () => {
    if (checkVipBeforeAdd()) {
      setShowAddModal(true);
    }
  };

  const handleToggle = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const handleSelect = (id: string) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelect = () => {
    if (isSelectMode) {
      setIsSelectMode(false);
      setSelectedTasks([]);
    } else {
      setIsSelectMode(true);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  const handleDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => prev.filter(x => x !== id));
  };

  const handleBatchDelete = () => {
    setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)));
    setSelectedTasks([]);
    setIsSelectMode(false);
  };

  const handleAddTask = (formData: {
    name: string; taskType: string; timeType: string;
    executeTime: string; path: string; note: string;
  }) => {
    const newTask: StartupTask = {
      id: Date.now().toString(),
      name: formData.name,
      path: formData.path,
      enabled: true,
      type: 'application',
      taskType: formData.taskType,
      timeType: formData.timeType,
      executeTime: formData.executeTime,
      timeUntilExec: '—',
      status: 'running',
      note: formData.note || '已添加',
      fileExt: formData.taskType === '打开应用' ? '.app' : formData.taskType === '打开执行文件' ? '.bat' : '.exe',
    };
    setTasks(prev => [...prev, newTask]);
  };

  return (
    <div className="home-page">
      <StatsBar
        totalTasks={stats.total}
        runningTasks={stats.running}
        failedTasks={stats.failed}
        todaySuccess={stats.todaySuccess}
        todayFailed={stats.todayFailed}
        onAddTask={handleAddClick}
        onImportTask={() => {}}
      />
      <TaskTable
        tasks={tasks}
        filteredTasks={filteredTasks}
        selectedTasks={selectedTasks}
        isSelectMode={isSelectMode}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onSelect={handleSelect}
        onToggle={handleToggle}
        onEdit={() => {}}
        onCopy={() => {}}
        onDelete={handleDelete}
        onExport={() => {}}
        onBatchDelete={handleBatchDelete}
        onBatchExport={() => {}}
      />
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
      />
    </div>
  );
};

export default HomePage;

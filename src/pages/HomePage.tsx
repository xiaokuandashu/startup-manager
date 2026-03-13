import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StartupTask } from '../types';
import StatsBar from '../components/StatsBar';
import TaskTable from '../components/TaskTable';
import AddTaskModal from '../components/AddTaskModal';

interface HomePageProps {
  searchQuery: string;
  checkVipBeforeAdd: () => boolean;
}

const TASKS_STORAGE_KEY = 'startup_tasks';
const EXECUTED_KEY = 'executed_tasks_today';

const loadTasks = (): StartupTask[] => {
  try {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load tasks:', e);
  }
  return [];
};

const saveTasks = (tasks: StartupTask[]) => {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks:', e);
  }
};

// 获取今日已执行任务 ID 集合
const getExecutedToday = (): Set<string> => {
  try {
    const data = localStorage.getItem(EXECUTED_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        return new Set(parsed.ids);
      }
    }
  } catch {}
  return new Set();
};

const markExecuted = (taskId: string) => {
  const executed = getExecutedToday();
  executed.add(taskId);
  localStorage.setItem(EXECUTED_KEY, JSON.stringify({
    date: new Date().toDateString(),
    ids: Array.from(executed),
  }));
};

// 计算倒计时文字
const calcCountdown = (executeTime: string, timeType: string): string => {
  if (!executeTime || timeType === '开机启动') return '开机时执行';
  try {
    const now = new Date();
    const [h, m] = executeTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) {
      // 如果今天已经过了执行时间，显示"明天"
      target.setDate(target.getDate() + 1);
    }
    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}小时${mins}分钟后`;
    return `${mins}分钟后`;
  } catch {
    return '—';
  }
};

// 检查任务是否应该执行
const shouldExecuteNow = (executeTime: string, timeType: string): boolean => {
  if (!executeTime || timeType === '开机启动') return false;
  try {
    const now = new Date();
    const [h, m] = executeTime.split(':').map(Number);
    // 当前时间与目标时间差在2分钟内就执行
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const targetMins = h * 60 + m;
    return Math.abs(nowMins - targetMins) <= 1;
  } catch {
    return false;
  }
};

// 执行 Tauri launch_app 命令
const executeLaunchApp = async (appPath: string): Promise<boolean> => {
  try {
    const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (!isTauri) {
      console.log('[模拟执行] launch_app:', appPath);
      return true;
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('launch_app', { appPath });
    return true;
  } catch (e) {
    console.error('启动失败:', e);
    return false;
  }
};

const HomePage: React.FC<HomePageProps> = ({ searchQuery, checkVipBeforeAdd }) => {
  const [tasks, setTasks] = useState<StartupTask[]>(loadTasks);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<StartupTask | null>(null);
  const executedRef = useRef<Set<string>>(getExecutedToday());

  // 自动保存到 localStorage
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // 每30秒更新倒计时 + 检查并执行到时任务
  useEffect(() => {
    const checkAndExecute = async () => {
      // 更新倒计时
      setTasks(prev => prev.map(t => ({
        ...t,
        timeUntilExec: calcCountdown(t.executeTime, t.timeType || ''),
      })));

      // 检查需要执行的任务
      const currentTasks = loadTasks(); // 读取最新状态
      for (const task of currentTasks) {
        if (!task.enabled) continue;
        if (executedRef.current.has(task.id)) continue;
        if (!task.executeTime || !task.path) continue;
        if (task.timeType === '开机启动') continue;

        if (shouldExecuteNow(task.executeTime, task.timeType || '')) {
          console.log(`[定时任务] 执行: ${task.name} -> ${task.path}`);
          executedRef.current.add(task.id);
          markExecuted(task.id);

          const success = await executeLaunchApp(task.path);
          setTasks(prev => prev.map(t => {
            if (t.id === task.id) {
              return {
                ...t,
                status: success ? 'running' : 'error',
                statusText: success ? '今日执行成功' : '今日执行失败',
              };
            }
            return t;
          }));
        }
      }
    };

    checkAndExecute();
    const timer = setInterval(checkAndExecute, 30000); // 每30秒检查一次
    return () => clearInterval(timer);
  }, []);

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
      setEditingTask(null);
      setShowAddModal(true);
    }
  };

  const handleToggle = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  }, []);

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

  // 编辑任务
  const handleEdit = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      setEditingTask(task);
      setShowAddModal(true);
    }
  }, [tasks]);

  // 复制任务
  const handleCopy = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      const copied: StartupTask = {
        ...task,
        id: Date.now().toString(),
        name: task.name + ' (副本)',
        statusText: '等待执行',
      };
      setTasks(prev => [...prev, copied]);
    }
  }, [tasks]);

  const handleDelete = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => prev.filter(x => x !== id));
  }, []);

  const handleBatchDelete = () => {
    setTasks(prev => prev.filter(t => !selectedTasks.includes(t.id)));
    setSelectedTasks([]);
    setIsSelectMode(false);
  };

  const handleAddTask = (formData: {
    name: string; taskType: string; timeType: string;
    executeTime: string; path: string; note: string;
  }) => {
    if (editingTask) {
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
    }

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const newTask: StartupTask = {
      id: editingTask?.id || Date.now().toString(),
      name: formData.name,
      path: formData.path,
      enabled: editingTask?.enabled ?? true,
      type: 'application',
      taskType: formData.taskType,
      timeType: formData.timeType,
      executeTime: formData.executeTime,
      timeUntilExec: calcCountdown(formData.executeTime, formData.timeType),
      status: 'running',
      note: formData.note,
      statusText: '等待执行',
      fileExt: formData.taskType === '打开应用' ? (isMac ? '.app' : '.exe') : formData.taskType === '打开执行文件' ? (isMac ? '.sh' : '.bat') : '.exe',
    };
    setTasks(prev => [...prev, newTask]);
    setEditingTask(null);
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
        onEdit={handleEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onExport={() => {}}
        onBatchDelete={handleBatchDelete}
        onBatchExport={() => {}}
      />
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingTask(null); }}
        onSubmit={handleAddTask}
      />
    </div>
  );
};

export default HomePage;
